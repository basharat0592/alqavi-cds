"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Trash2, X, CheckCircle, Package, ArrowLeft,
    RefreshCw, Save, Search, ChevronDown, User,
    Printer, Loader2, AlertTriangle, ShieldCheck, History, MapPin, Phone, ScanLine
} from 'lucide-react';
import { productService, orderService, userService, companyService, inventoryService } from '@/lib/api';
import { installmentService } from '@/services/payment.service';
import { deliveryService } from '@/services/delivery.service';
import { authService } from '@/lib/auth';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';
/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - POS (ENTRY FORM STYLE)
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#F59E0B] border-[#F59E0B] hover:bg-[#B4780B] hover:border-[#F59E0B] text-white shadow-sm shadow-[#F59E0B]/20',
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

const inputCls = ui.inputBase.replace('h-10', 'h-[38px]');
const selectCls = `${inputCls} cursor-pointer`;

type SaleItem = {
    product: string;
    product_name: string;
    quantity: number;
    unit_price: number;      // Unit TP (editable sale rate)
    bonus: number;           // Bon(U) — free units
    discountPct: number;     // per-line Disct %
    cost: number;            // snapshot cost for profit calc
    stock: number;
    weight?: string;
    size?: string;
};

const EMPTY_SALE_ITEM: SaleItem = {
    product: '', product_name: '', quantity: 1, unit_price: 0,
    bonus: 0, discountPct: 0, cost: 0, stock: 0, weight: '', size: '',
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
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#92600A] transition-colors" />
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
                                    className="flex items-center gap-4 p-3 hover:bg-[#B4780B]/50 cursor-pointer transition-colors border-b last:border-0 border-slate-100 group"
                                >
                                    <div className="w-10 h-10 bg-white flex items-center justify-center rounded border border-slate-200 shrink-0 overflow-hidden group-hover:border-[#F59E0B]/40 transition-colors">
                                        {(p.image || p.catalog_image) ? (
                                            <img src={getImageUrl(p.image || p.catalog_image)} className="max-w-full max-h-full object-cover" alt="" />
                                        ) : (
                                            <Package size={18} className="text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-[#92600A] transition-colors">
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
                         <button onClick={() => setOpen(false)} className="text-[11px] font-black text-[#B4780B] hover:text-[#92600A] hover:underline">Close List</button>
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
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#92600A]" />
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
                                className="flex items-center gap-3 p-3 hover:bg-[#B4780B]/50 cursor-pointer border-b last:border-0 border-slate-100"
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
    const [riders, setRiders] = useState<any[]>([]);
    const [selectedRider, setSelectedRider] = useState('');
    // Finalize dispatch modal: create as SHIPPED (dispatch to rider) or DELIVERED (done now).
    const [finalizeMode, setFinalizeMode] = useState<'shipped' | 'delivered'>('delivered');
    const [shipMode, setShipMode] = useState<'specific' | 'all'>('all');
    const [shipFee, setShipFee] = useState('');
    
    // Form and Items State
    const [orderNumber, setOrderNumber] = useState(`SAL-${Date.now().toString().slice(-6)}`);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [customerId, setCustomerId] = useState<string>('');
const [warehouseId, setWarehouseId] = useState<string>('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    // Settlement mode: full = paid in full now; partial = pay some now, rest later;
    // credit = nothing now, customer owes the balance by a due date.
    const [payMode, setPayMode] = useState<'full' | 'partial'>('full');
    const [amountPaidNow, setAmountPaidNow] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<SaleItem[]>([{ ...EMPTY_SALE_ITEM }]);
    // Salesman (desktop "Saleman") + staff options.
    const [staffList, setStaffList] = useState<any[]>([]);
    const [salesperson, setSalesperson] = useState<string>('');
    // Selected customer's outstanding balance (desktop "Prev. Bal").
    const [prevBalance, setPrevBalance] = useState<number>(0);
    
    // Discount and Shipping Charges state
    const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
    const [discountVal, setDiscountVal] = useState('');
    const [stockError, setStockError] = useState<string | null>(null);
    const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);
    // Scanner input, cash tendered, parked sales, and post-save-attempt error marking.
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeRef = useRef<HTMLInputElement>(null);
    const [amountTendered, setAmountTendered] = useState('');
    const [heldSales, setHeldSales] = useState<any[]>([]);
    const [showErrors, setShowErrors] = useState(false);

    // Delivery fields for assigning rider
    const [deliveryCustomerName, setDeliveryCustomerName] = useState('');
    const [deliveryCustomerPhone, setDeliveryCustomerPhone] = useState('');
    const [deliveryCustomerAddress, setDeliveryCustomerAddress] = useState('');

    useEffect(() => {
        if (customerId) {
            const u = users.find(usr => String(usr.id) === String(customerId));
            if (u) {
                const name = u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Registered Customer';
                setDeliveryCustomerName(name);
                setDeliveryCustomerPhone(u.phone || '');
                setDeliveryCustomerAddress(u.address || '');
            }
        } else {
            setDeliveryCustomerName(guestName);
            setDeliveryCustomerPhone(guestPhone);
            setDeliveryCustomerAddress('');
        }
    }, [customerId, guestName, guestPhone, users]);

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

            // LIVE SYNC: If a warehouse is selected, refresh its specific stock levels too.
            // Fetch ALL batches (no_pagination) and SUM them per product — a product can
            // have several stock batches, so a single row underreports the real on-hand qty.
            if (warehouseId) {
                const stockRes = await inventoryService.getInventory({ warehouse: warehouseId, no_pagination: 'true' }).catch(() => []);
                const stockData = Array.isArray(stockRes) ? stockRes : (stockRes as any)?.results || [];
                setWarehouseStock(stockData);

                const sumStock = (name: string, weight?: string, size?: string) =>
                    stockData.reduce((acc: number, s: any) => {
                        const m = (s.product_name || '').toLowerCase().trim() === (name || '').toLowerCase().trim()
                            && (s.weight || '') === (weight || '') && (s.size || '') === (size || '');
                        return m ? acc + Number(s.total_quantity || 0) : acc;
                    }, 0);

                // Update current bill items with the latest (summed) warehouse stock.
                setItems(prev => prev.map(item => {
                    if (!item.product) return item;
                    return { ...item, stock: sumStock(item.product_name, item.weight, item.size) };
                }));
            }
        } catch { 
            if (!silent) toast.error('Failed to sync catalog'); 
        } finally { 
            setLoading(false); 
        }
    }, [warehouseId]); 

    useEffect(() => { loadData(); }, [loadData]);

    // Delivery riders for the optional "assign rider" step on the confirm popup.
    useEffect(() => {
        deliveryService.getAll().then((r) => setRiders(r.filter((x: any) => x.is_active !== false))).catch(() => setRiders([]));
    }, []);

    // Salesman options — internal staff, loaded once.
    useEffect(() => {
        userService.getAll().then((allUsers: any) => {
            const staff = (Array.isArray(allUsers) ? allUsers : allUsers?.results || [])
                .filter((usr: any) => {
                    const r = (usr.role_name || '').toLowerCase();
                    return !r.includes('supplier') && !r.includes('customer') && !r.includes('delivery');
                })
                .map((usr: any) => ({ id: usr.id, name: usr.full_name || `${usr.first_name || ''} ${usr.last_name || ''}`.trim() || usr.username }));
            setStaffList(staff);
        }).catch(() => setStaffList([]));
    }, []);

    // Previous outstanding balance for the chosen registered customer (desktop "Prev. Bal").
    useEffect(() => {
        if (!customerId) { setPrevBalance(0); return; }
        orderService.getCustomerBalance?.(customerId)
            .then((b: any) => setPrevBalance(Number(b?.previous_balance || 0)))
            .catch(() => setPrevBalance(0));
    }, [customerId]);

    // Source warehouse = the logged-in branch admin's own branch. There's no picker;
    // we auto-select their assigned warehouse (falling back to the first available).
    useEffect(() => {
        if (warehouseId) return;
        const u: any = authService.getUser();
        const mine = Array.isArray(u?.warehouses) && u.warehouses.length ? String(u.warehouses[0].id) : '';
        if (mine) setWarehouseId(mine);
        else if (warehouses.length > 0) setWarehouseId(String(warehouses[0].id));
    }, [warehouses]);


    // Live Telemetry: Auto-update catalog every 10 seconds to keep stock in sync
    useEffect(() => {
        const timer = setInterval(() => {
            if (!loading && !saving) {
                loadData(true);
            }
        }, 10000); // Increased to 10s to reduce terminal activity/noise
        return () => clearInterval(timer);
    }, [loading, saving, loadData]);

    const addItem = () => setItems(prev => [...prev, { ...EMPTY_SALE_ITEM }]);

    const removeItem = (i: number) => {
        if (items.length > 1) setItems(prev => prev.filter((_, idx) => idx !== i));
        else setItems([{ ...EMPTY_SALE_ITEM }]);
    };

    const updateItem = (i: number, pInfo: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            return {
                ...item,
                product: String(pInfo.id),
                product_name: pInfo.product_name || pInfo.name,
                unit_price: parseFloat(pInfo.selling_price || pInfo.price || 0),
                cost: parseFloat(pInfo.cost_price || 0),
                stock: pInfo.total_quantity || pInfo.stock_quantity || (typeof pInfo.stock === 'number' ? pInfo.stock : 0),
                quantity: 1,
                bonus: 0,
                discountPct: 0,
                weight: pInfo.weight,
                size: pInfo.size
            };
        }));
    };

    // Patch a single editable field on a line (rate, bonus, discount %).
    const patchItem = (i: number, field: keyof SaleItem, val: number) => {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
    };

    // Charged net for a line: qty × rate − line discount (bonus units are free).
    const lineNet = (it: SaleItem) => {
        const gross = (parseInt(it.quantity as any) || 0) * (parseFloat(it.unit_price as any) || 0);
        const disc = gross * ((parseFloat(it.discountPct as any) || 0) / 100);
        return Math.max(0, gross - disc);
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

    // Subtotal now nets each line's own discount (desktop "Sub Total" column sum).
    const totalBill = items.reduce((sum, item) => sum + lineNet(item), 0);

    // Calculate discount amount
    const enteredDiscount = parseFloat(discountVal) || 0;
    // Capped at the bill: the UI clamps the grand total at zero but the backend
    // doesn't, so an over-large discount would display Rs 0 while storing a
    // negative total — which then drives payment status the wrong way.
    const discountAmount = Math.min(
        discountType === 'percent' ? (totalBill * (enteredDiscount / 100)) : enteredDiscount,
        totalBill,
    );
    const discountCapped = enteredDiscount > 0 && discountAmount < (discountType === 'percent' ? (totalBill * (enteredDiscount / 100)) : enteredDiscount);

    const parsedShipping = 0; // shipping charges removed from POS
    const grandTotal = Math.max(0, totalBill + parsedShipping - discountAmount);

    // Profit (desktop "Invoice Pur.Value / Profit"): charged net − cost of all
    // physical units shipped (paid + bonus), less the order-level discount.
    const totalCost = items.reduce((sum, item) => {
        const units = (parseInt(item.quantity as any) || 0) + (parseInt(item.bonus as any) || 0);
        return sum + units * (parseFloat(item.cost as any) || 0);
    }, 0);
    const invoiceProfit = grandTotal - totalCost;
    const profitPct = totalCost > 0 ? (invoiceProfit / totalCost) * 100 : 0;

    // How much is collected at checkout, and the resulting settlement status.
    const paidNow = payMode === 'full'
        ? grandTotal
        : payMode === 'partial'
            ? Math.min(Number(amountPaidNow) || 0, grandTotal)
            : 0;
    const settlementStatus = paidNow >= grandTotal ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'UNPAID';

    // Products available in THIS branch's warehouse only, each carrying its real
    // stock count. Identity is NAME (within the branch) — NOT weight/size, which can
    // drift from the Stock row and would otherwise hide the product entirely. A product
    // is listed if it belongs to this branch OR has stock recorded here; deduped by
    // name, quantity = summed branch stock (falling back to the product's own count).
    const branchProducts = (() => {
        const stockByName: Record<string, number> = {};
        warehouseStock.forEach((s: any) => {
            const k = (s.product_name || '').toLowerCase().trim();
            if (k) stockByName[k] = (stockByName[k] || 0) + Number(s.total_quantity || 0);
        });
        const out = new Map<string, any>();
        products.forEach((p: any) => {
            const k = (p.product_name || '').toLowerCase().trim();
            if (!k) return;
            const inThisBranch = !!warehouseId && String(p.warehouse ?? '') === String(warehouseId);
            const hasBranchStock = k in stockByName;
            if (!inThisBranch && !hasBranchStock) return; // belongs to another branch
            const qty = hasBranchStock ? stockByName[k] : Number(p.total_quantity || 0);
            // Prefer the Product row that actually belongs to this warehouse.
            if (!out.has(k) || inThisBranch) out.set(k, { ...p, total_quantity: qty });
        });
        return [...out.values()];
    })();

    /* ─── Barcode / scanner entry ───
       A hardware scanner types the code then sends Enter, so this is just a text
       field with an Enter handler. Matching is by barcode OR sku, since products
       created from the purchase screen set both. */
    const findByCode = (code: string) => {
        const q = code.trim().toLowerCase();
        if (!q) return null;
        return branchProducts.find((p: any) =>
            String(p.barcode ?? '').toLowerCase() === q ||
            String(p.sku ?? '').toLowerCase() === q
        ) ?? null;
    };

    const addByBarcode = (rawCode: string) => {
        const code = rawCode.trim();
        if (!code) return;
        const p: any = findByCode(code);
        if (!p) {
            toast.error(`No product matches "${code}"`, { id: 'scan-miss' });
            return;
        }
        const stock = Number(p.total_quantity ?? p.stock_quantity ?? 0);
        setItems(prev => {
            const idx = prev.findIndex(it => String(it.product) === String(p.id));
            if (idx >= 0) {
                const line = prev[idx];
                if (stock > 0 && (line.quantity || 0) + 1 > stock) {
                    toast.error(`Only ${stock} in stock for ${line.product_name}`, { id: 'scan-stock' });
                    return prev;
                }
                toast.success(`${line.product_name} ×${(line.quantity || 0) + 1}`, { id: 'scan-hit' });
                return prev.map((x, i) => i === idx ? { ...x, quantity: (x.quantity || 0) + 1 } : x);
            }
            if (stock <= 0) {
                toast.error(`${p.product_name || p.name} is out of stock`, { id: 'scan-stock' });
                return prev;
            }
            const line: SaleItem = {
                ...EMPTY_SALE_ITEM,
                product: String(p.id),
                product_name: p.product_name || p.name,
                unit_price: parseFloat(p.selling_price || p.price || 0),
                cost: parseFloat(p.cost_price || 0),
                stock,
                quantity: 1,
                weight: p.weight,
                size: p.size,
            };
            toast.success(`Added ${line.product_name}`, { id: 'scan-hit' });
            // Fill the blank starter row rather than leaving an empty line above.
            const blank = prev.findIndex(it => !it.product);
            if (blank >= 0) return prev.map((x, i) => i === blank ? line : x);
            return [...prev, line];
        });
        setBarcodeInput('');
        barcodeRef.current?.focus();
    };

    /* ─── Cash tendered / change due ───
       Only meaningful for cash: what the customer handed over vs what to give back. */
    const tendered = parseFloat(amountTendered) || 0;
    const amountCollectable = payMode === 'full' ? grandTotal : paidNow;
    const changeDue = Math.max(0, tendered - amountCollectable);
    const tenderShort = tendered > 0 && tendered < amountCollectable;

    /* ─── Held (parked) sales ─── */
    const HOLD_KEY = 'pos.heldSales';
    const readHeld = (): any[] => {
        try { return JSON.parse(window.localStorage.getItem(HOLD_KEY) || '[]'); } catch { return []; }
    };
    const writeHeld = (list: any[]) => {
        try { window.localStorage.setItem(HOLD_KEY, JSON.stringify(list)); } catch { /* storage disabled */ }
        setHeldSales(list);
    };
    const cartHasContent = items.some(it => it.product);

    const holdSale = () => {
        if (!cartHasContent) return toast.error('Nothing to hold yet.');
        const snapshot = {
            id: `${orderNumber}-${items.length}-${Math.round(grandTotal)}`,
            heldAtLabel: new Date().toLocaleTimeString(),
            items, customerId, guestName, guestPhone, salesperson,
            discountType, discountVal, paymentMethod, total: grandTotal,
        };
        writeHeld([snapshot, ...readHeld()].slice(0, 12));
        setItems([{ ...EMPTY_SALE_ITEM }]);
        setCustomerId(''); setGuestName(''); setGuestPhone('');
        setDiscountVal(''); setAmountTendered(''); setAmountPaidNow('');
        toast.success('Sale held.');
        barcodeRef.current?.focus();
    };

    const resumeSale = (h: any) => {
        if (cartHasContent && !window.confirm('Replace the current cart with the held sale?')) return;
        setItems(h.items?.length ? h.items : [{ ...EMPTY_SALE_ITEM }]);
        setCustomerId(h.customerId || ''); setGuestName(h.guestName || '');
        setGuestPhone(h.guestPhone || ''); setSalesperson(h.salesperson || '');
        setDiscountType(h.discountType || 'flat'); setDiscountVal(h.discountVal || '');
        setPaymentMethod(h.paymentMethod || 'cash');
        writeHeld(readHeld().filter((x: any) => x.id !== h.id));
        toast.success('Held sale resumed.');
    };

    useEffect(() => { setHeldSales(readHeld()); }, []);

    /* Row-level validation. Reported by line number so a cashier with a long cart
       knows which one to fix, and only surfaced once a save has been attempted. */
    const firstInvalidRow = () => {
        const noProduct = items.findIndex(it => !it.product);
        if (noProduct >= 0) return { row: noProduct, msg: `Line ${noProduct + 1}: choose a product` };
        const badQty = items.findIndex(it => (it.quantity || 0) < 1);
        if (badQty >= 0) return { row: badQty, msg: `Line ${badQty + 1}: quantity must be at least 1` };
        const overStock = items.findIndex(it => (it.stock || 0) > 0 && (it.quantity || 0) > it.stock);
        if (overStock >= 0) return { row: overStock, msg: `Line ${overStock + 1}: only ${items[overStock].stock} in stock` };
        return null;
    };
    const rowIsInvalid = (it: SaleItem) =>
        showErrors && (!it.product || (it.quantity || 0) < 1 || ((it.stock || 0) > 0 && (it.quantity || 0) > it.stock));

    /* Keyboard: F2 jumps to the scanner box, Ctrl/Cmd+Enter reviews the sale,
       Esc closes whichever dialog is open. Ignored while typing in a field so it
       never fights normal data entry. */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
            if (e.key === 'F2') { e.preventDefault(); barcodeRef.current?.focus(); barcodeRef.current?.select(); return; }
            if (e.key === 'Escape') {
                if (showConfirm) { setShowConfirm(false); return; }
                if (stockError) { setStockError(null); return; }
                if (typing) (el as HTMLElement).blur();
                return;
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (successOrder || saving) return;
                const bad = firstInvalidRow();
                if (bad) { setShowErrors(true); toast.error(bad.msg); return; }
                if (!warehouseId) { toast.error('No source warehouse selected'); return; }
                setShowConfirm(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [items, showConfirm, stockError, successOrder, saving, warehouseId]);

    // Scanner box takes focus on load — the normal starting point for a cashier.
    useEffect(() => { if (!loading && !successOrder) barcodeRef.current?.focus(); }, [loading, successOrder]);

    // Don't let a reload silently bin a cart that has lines on it.
    useEffect(() => {
        if (!cartHasContent || successOrder) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [cartHasContent, successOrder]);

    const handleSave = async () => {
        // An impatient double-click would otherwise bill the sale twice.
        if (saving) return;
        // Guard rails for credit / partial sales (allowed for walk-in too now).
        if (payMode !== 'full') {
            if (!dueDate) { setShowConfirm(false); return toast.error('Set a payment due date for the outstanding balance.'); }
            if (payMode === 'partial' && (paidNow < 0 || paidNow >= grandTotal)) {
                setShowConfirm(false);
                return toast.error('Enter an amount paid now that is less than the total.');
            }
        }
        if (finalizeMode === 'shipped' && shipMode === 'specific' && !selectedRider) {
            setShowConfirm(false);
            return toast.error('Pick a rider, or choose "All riders".');
        }
        setShowConfirm(false);
        setSaving(true);
        try {
            const resolvedCustomerName = customerId
                ? (() => {
                    const u = users.find(usr => String(usr.id) === String(customerId));
                    if (!u) return 'Registered Customer';
                    if (u.first_name || u.last_name) return `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    return u.full_name || u.username || 'Registered Customer';
                })()
                : (guestName || 'Walk-in Customer');

            const isShipped = finalizeMode === 'shipped';
            const payload = {
                customer: customerId || null,
                customer_name: deliveryCustomerName || resolvedCustomerName,
                shipping_address: deliveryCustomerAddress || 'Walk-in Store Selection',
                phone_number: deliveryCustomerPhone || guestPhone || 'N/A',
                notes: `POS Gen: ${orderNumber}`,
                // Shipped → out for delivery (shows in the rider feed); Delivered → done now.
                status: isShipped ? 'SHIPPED' : 'DELIVERED',
                payment_method: paymentMethod === 'cash' ? 'SHOP' : 'ONLINE',
                payment_status: settlementStatus,
                amount_paid: paidNow,
                due_date: payMode !== 'full' && dueDate ? dueDate : null,
                warehouse_id: warehouseId,
                discount: discountAmount,
                shipping_cost: 0,
                salesperson: salesperson || null,
                sale_date: orderDate || null,
                items: items.map(i => {
                    const gross = (parseInt(i.quantity as any) || 0) * (parseFloat(i.unit_price as any) || 0);
                    const lineDisc = gross * ((parseFloat(i.discountPct as any) || 0) / 100);
                    return {
                        id: i.product,
                        quantity: i.quantity,
                        price: i.unit_price,
                        bonus_quantity: parseInt(i.bonus as any) || 0,
                        discount: Number(lineDisc.toFixed(2)),
                    };
                })
            };
            const data = await orderService.create(payload);
            // On dispatch: assign to a specific rider, or broadcast to all (null rider),
            // saving the offered delivery price either way.
            if (isShipped && data?.id) {
                const riderId = shipMode === 'specific' ? selectedRider : null;
                try { await deliveryService.assignToOrder(String(data.id), riderId, shipFee || 0); } catch { /* non-blocking */ }
            }
            // Record the amount collected now as an installment so it shows in the
            // payment history (full sales already book via delivery).
            let installmentOk = true;
            if (payMode === 'partial' && paidNow > 0 && data?.id) {
                try {
                    await installmentService.create({
                        source_type: 'order',
                        source_id: String(data.id),
                        amount: paidNow,
                        method: paymentMethod === 'cash' ? 'cash' : 'online',
                        status: 'confirmed',
                        direction: 'inbound',
                        paid_at: new Date().toISOString(),
                        reference: orderNumber,
                    });
                } catch (e) {
                    installmentOk = false;
                    console.error('installment record failed', e);
                }
            }
            setSuccessOrder(data);
            if (payMode === 'partial' && !installmentOk) {
                // Don't pretend it fully succeeded — the admin must collect it from
                // Sales History so the payment history stays accurate.
                toast.error(
                    'Sale saved, but recording the partial payment failed. Open it in Sales History → Collect to add the payment.',
                    { duration: 7000 }
                );
            } else {
                toast.success(payMode === 'partial' ? 'Sale saved (partial payment)!' : 'Sale finalized!');
            }
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
                    {/* ?print=true makes the invoice route fire window.print() once loaded. */}
                    <Btn
                        className="w-full h-[42px] font-bold mb-3"
                        onClick={() => router.push(`/admin/sales/${successOrder.id}/invoice?print=true`)}
                    >
                        <Printer size={18} /> Print Receipt
                    </Btn>
                    <div className="flex gap-4">
                        <Btn variant="secondary" className="flex-1 h-[40px] font-bold" onClick={() => router.push(`/admin/sales/${successOrder.id}/invoice`)}>View Invoice</Btn>
                        <Btn variant="secondary" className="flex-1 h-[40px] font-bold" onClick={() => router.push('/admin/sales')}><History size={18} /> View Sales</Btn>
                    </div>
                    <button
                        onClick={() => {
                            setSuccessOrder(null);
                            setItems([{ ...EMPTY_SALE_ITEM }]);
                            setCustomerId(''); setGuestName(''); setGuestPhone('');
                            setDiscountVal(''); setAmountTendered(''); setAmountPaidNow('');
                            setOrderNumber(`SAL-${Date.now().toString().slice(-6)}`);
                            setShowErrors(false);
                        }}
                        className="mt-4 text-[13px] font-bold text-[#B4780B] hover:text-[#92600A] hover:underline"
                    >
                        + Start next sale
                    </button>
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
                        <Loader2 size={32} className="animate-spin text-[#B4780B]" />
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
                                    {/* Walk-in name + contact — only when no registered account is chosen. */}
                                    {!customerId && (
                                        <Field label="Walk-in Name">
                                            <input className={inputCls} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Adnan Ali" />
                                        </Field>
                                    )}
                                    {!customerId && (
                                        <Field label="Walk-in Contact Number">
                                            <input className={inputCls} value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="e.g. 03xx-xxxxxxx" />
                                        </Field>
                                    )}
                                    <Field label="Salesman">
                                        <select className={selectCls} value={salesperson} onChange={e => setSalesperson(e.target.value)}>
                                            <option value="">Select any one</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Sale Date">
                                        <input className={inputCls} type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                                    </Field>
                                </div>
                            </Card>

                            {/* Line Items Detail */}
                            <Card className="relative z-[10] overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 rounded-t-2xl">
                                    <div className="min-w-0">
                                        <h2 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wider text-slate-700">Sale Items</h2>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium italic">Scan a barcode, or add products manually.</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Btn variant="secondary" onClick={holdSale} className="font-bold" disabled={!cartHasContent}>Hold</Btn>
                                        <Btn variant="secondary" onClick={addItem} className="font-bold"><Plus size={14} /> Add Item</Btn>
                                    </div>
                                </div>

                                {/* Scanner box — a hardware scanner types the code and sends Enter. */}
                                <div className="px-4 sm:px-6 pt-4">
                                    <div className="relative">
                                        <ScanLine size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B4780B] pointer-events-none" />
                                        <input
                                            ref={barcodeRef}
                                            value={barcodeInput}
                                            onChange={e => setBarcodeInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') { e.preventDefault(); addByBarcode(barcodeInput); }
                                                else if (e.key === 'Escape') { setBarcodeInput(''); }
                                            }}
                                            placeholder="Scan barcode or type a code, then press Enter…"
                                            aria-label="Barcode scanner input"
                                            className="w-full h-11 pl-10 pr-20 rounded-xl border-2 border-[#F59E0B]/40 bg-[#F59E0B]/5 text-[14px] font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#F59E0B] focus:bg-white focus:ring-4 focus:ring-[#F59E0B]/20"
                                        />
                                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-sans font-bold text-slate-500 pointer-events-none">F2</kbd>
                                    </div>
                                    {heldSales.length > 0 && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Held</span>
                                            {heldSales.map((h: any) => (
                                                <button
                                                    key={h.id}
                                                    onClick={() => resumeSale(h)}
                                                    title={`Resume sale held at ${h.heldAtLabel}`}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[11.5px] font-bold text-[#B4780B] hover:bg-[#F59E0B]/20 transition-colors"
                                                >
                                                    {h.heldAtLabel} · {formatCurrency(h.total)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 sm:p-5 space-y-3">
                                    {items.map((item, i) => {
                                        const net = lineNet(item);
                                        const gross = (parseInt(item.quantity as any) || 0) * (parseFloat(item.unit_price as any) || 0);
                                        const discAmt = gross - net;
                                        return (
                                        <div key={i} className={`bg-white border rounded-xl p-3 sm:p-4 transition-all hover:shadow-sm animate-in slide-in-from-left-2 duration-300 ${rowIsInvalid(item) ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200/70 hover:border-[#F59E0B]/35'}`}>
                                            {/* Product + remove */}
                                            <div className="flex items-end gap-2.5">
                                                <span className="hidden sm:flex shrink-0 mb-1.5 w-6 h-6 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] text-[11px] font-black items-center justify-center tabular-nums ring-1 ring-inset ring-[#F59E0B]/15">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <ProductSelector
                                                        selectedId={item.product}
                                                        products={branchProducts}
                                                        inputCls={selectCls}
                                                        onSelect={(p: any) => updateItem(i, p)}
                                                    />
                                                </div>
                                                <button onClick={() => removeItem(i)} title="Remove" className="shrink-0 mb-0.5 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            {/* Per-line fields grid */}
                                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                                <div>
                                                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty {item.stock > 0 ? <span className="text-slate-300 normal-case">/ {item.stock}</span> : ''}</label>
                                                    <input
                                                        className={inputCls + " text-center font-black text-[#B4780B]"}
                                                        type="number" min="1"
                                                        value={item.quantity || ''}
                                                        onChange={e => updateQty(i, parseInt(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Bonus (U)</label>
                                                    <input
                                                        className={inputCls + " text-center tabular-nums text-emerald-700 font-bold"}
                                                        type="number" min="0"
                                                        value={item.bonus || ''}
                                                        onChange={e => patchItem(i, 'bonus', Math.max(0, parseInt(e.target.value) || 0))}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Rate (TP)</label>
                                                    <div className="relative flex items-center">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">Rs</span>
                                                        <input
                                                            className={inputCls + " pl-6 text-center tabular-nums font-bold text-slate-800"}
                                                            type="number" min="0" step="0.01"
                                                            value={item.unit_price || ''}
                                                            onChange={e => patchItem(i, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Disc %</label>
                                                    <div className="relative flex items-center">
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">%</span>
                                                        <input
                                                            className={inputCls + " pr-5 text-center tabular-nums"}
                                                            type="number" min="0" max="100"
                                                            value={item.discountPct || ''}
                                                            onChange={e => patchItem(i, 'discountPct', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Amt</label>
                                                    <div className="h-[38px] flex items-center justify-end px-3 rounded-lg bg-slate-50 border border-slate-200/70">
                                                        <span className="text-[14px] font-black text-slate-900 tabular-nums">{formatCurrency(net)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(item.bonus > 0 || discAmt > 0) && (
                                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-500">
                                                    {item.bonus > 0 && <span className="text-emerald-700">+{item.bonus} bonus units (free)</span>}
                                                    {discAmt > 0 && <span>Disc: <b className="text-rose-600">-{formatCurrency(discAmt)}</b></span>}
                                                    <span>Total pcs: <b className="text-slate-700 tabular-nums">{(parseInt(item.quantity as any) || 0) + (parseInt(item.bonus as any) || 0)}</b></span>
                                                </div>
                                            )}
                                        </div>
                                    );})}

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
                                
                                <div className="p-6 space-y-5">
                                    {/* Settlement: Full / Partial (available for walk-in too) */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Settlement</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([['full', 'Full'], ['partial', 'Partial']] as const).map(([m, label]) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setPayMode(m)}
                                                    className={`h-10 rounded-xl border text-[12.5px] font-bold transition-all ${payMode === m ? 'border-[#F59E0B] bg-[#F59E0B]/70 text-[#B4780B] shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Payment method — moved here as a dropdown */}
                                        <div className="mt-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 bg-white font-medium">
                                                <option value="cash">Cash</option>
                                                <option value="online">Online Transfer</option>
                                            </select>
                                        </div>

                                        {/* Cash drawer maths — what was handed over, and what to give back. */}
                                        {paymentMethod === 'cash' && amountCollectable > 0 && (
                                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cash Received</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">Rs</span>
                                                    <input
                                                        type="number" min={0} inputMode="decimal"
                                                        value={amountTendered}
                                                        onChange={e => setAmountTendered(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-slate-200 text-[13px] text-right font-bold tabular-nums outline-none bg-white transition-all focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10"
                                                    />
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <button type="button" onClick={() => setAmountTendered(String(amountCollectable))}
                                                        className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-[#F59E0B]/50 hover:text-[#B4780B] transition-colors">Exact</button>
                                                    {[500, 1000, 5000].map(d => (
                                                        <button key={d} type="button" onClick={() => setAmountTendered(String(d))}
                                                            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-[#F59E0B]/50 hover:text-[#B4780B] transition-colors tabular-nums">{d}</button>
                                                    ))}
                                                </div>
                                                {tendered > 0 && (
                                                    <div className={`mt-2.5 flex justify-between items-center rounded-lg px-3 py-2 ${tenderShort ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                                                        <span className={`text-[11px] font-black uppercase tracking-wider ${tenderShort ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                            {tenderShort ? 'Short by' : 'Change due'}
                                                        </span>
                                                        <span className={`text-[16px] font-black tabular-nums ${tenderShort ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                            {formatCurrency(tenderShort ? amountCollectable - tendered : changeDue)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {payMode !== 'full' && (
                                            <div className="mt-3 space-y-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3.5">
                                                {payMode === 'partial' && (
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Received Now</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">Rs</span>
                                                            <input
                                                                type="number" min={0} max={grandTotal} value={amountPaidNow}
                                                                onChange={e => setAmountPaidNow(e.target.value)} placeholder="0.00"
                                                                className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 tabular-nums bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Balance Due Date</label>
                                                    <input
                                                        type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 bg-white"
                                                    />
                                                </div>
                                                <p className="flex items-start gap-1.5 text-[10.5px] text-amber-700 font-medium leading-snug">
                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                                    The remaining balance is tracked as outstanding and can be collected later from Sales History.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Discount Controls */}
                                    <div className="space-y-4 pt-2 border-t border-slate-100">
                                        {/* Discount Input */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Discount</label>
                                                <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200/50">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDiscountType('flat')}
                                                        className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase transition-all ${discountType === 'flat' ? 'bg-white text-[#B4780B] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        Rs
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDiscountType('percent')}
                                                        className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase transition-all ${discountType === 'percent' ? 'bg-white text-[#B4780B] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">
                                                    {discountType === 'flat' ? 'Rs' : '%'}
                                                </span>
                                                <input
                                                    type="number" min={0} value={discountVal}
                                                    onChange={e => setDiscountVal(e.target.value)} placeholder="0.00"
                                                    className="w-full h-[38px] pl-8 pr-3 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 bg-white transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <div className="flex justify-between text-[13px] text-slate-500">
                                            <span>Subtotal ({items.reduce((a,b)=>a+(b.product?b.quantity:0), 0)} items)</span>
                                            <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(totalBill)}</span>
                                        </div>
                                        {parsedShipping > 0 && (
                                            <div className="flex justify-between text-[13px] text-slate-500">
                                                <span>Shipping Cost</span>
                                                <span className="font-bold text-slate-900 tabular-nums">+{formatCurrency(parsedShipping)}</span>
                                            </div>
                                        )}
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-[13px] text-slate-500">
                                                <span>
                                                    Discount {discountType === 'percent' ? `(${discountVal}%)` : ''}
                                                    {discountCapped && <span className="ml-1 text-[11px] font-bold text-amber-600">capped at bill</span>}
                                                </span>
                                                <span className="font-bold text-rose-600 tabular-nums">-{formatCurrency(discountAmount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-[13px] text-slate-500">
                                            <span>Service Tax</span>
                                            <span className="text-slate-400 tabular-nums">{formatCurrency(0)}</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-2" />
                                        <div className="flex justify-between items-center pt-1">
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</p>
                                                <p className="text-[24px] font-black text-slate-900 tabular-nums">
                                                    {formatCurrency(grandTotal)}
                                                </p>
                                            </div>
                                        </div>
                                        {payMode !== 'full' && (
                                            <div className="flex justify-between items-center pt-1 text-[13px]">
                                                <span className="font-semibold text-emerald-600">Paid Now</span>
                                                <span className="font-bold text-emerald-700 tabular-nums">{formatCurrency(paidNow)}</span>
                                            </div>
                                        )}
                                        {payMode !== 'full' && (
                                            <div className="flex justify-between items-center text-[13px]">
                                                <span className="font-semibold text-rose-600">Balance Due</span>
                                                <span className="font-bold text-rose-700 tabular-nums">{formatCurrency(grandTotal - paidNow)}</span>
                                            </div>
                                        )}

                                        {/* Previous balance + running net balance (registered customer) */}
                                        {customerId && prevBalance > 0 && (
                                            <div className="mt-1 pt-3 border-t border-slate-100 space-y-2">
                                                <div className="flex justify-between items-center text-[13px]">
                                                    <span className="text-slate-500">Previous Balance</span>
                                                    <span className="font-bold text-amber-600 tabular-nums">{formatCurrency(prevBalance)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[13px]">
                                                    <span className="font-semibold text-slate-700">Net Balance</span>
                                                    <span className="font-black text-rose-700 tabular-nums">{formatCurrency(prevBalance + (grandTotal - paidNow))}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Profit tracking (cost-based) */}
                                    {totalCost > 0 && (
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-700/70 uppercase tracking-widest">Invoice Profit</p>
                                                <p className={`text-[17px] font-black tabular-nums ${invoiceProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(invoiceProfit)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-emerald-700/70 uppercase tracking-widest">Margin</p>
                                                <p className={`text-[17px] font-black tabular-nums ${invoiceProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{profitPct.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => {
                                            const bad = firstInvalidRow();
                                            if (bad) { setShowErrors(true); return toast.error(bad.msg); }
                                            if (!warehouseId) return toast.error('Please select a source warehouse');
                                            setShowErrors(false);
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
                title="Finalize Order"
                size="md"
                footer={
                    <div className="w-full space-y-3">
                        <Button variant="primary" onClick={handleSave} className="w-full">
                            {finalizeMode === 'shipped' ? 'Dispatch & Bill' : 'Complete Sale'}
                        </Button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="w-full text-[13px] text-[#B4780B] hover:text-[#92600A] hover:underline font-bold"
                        >
                            Cancel & Review
                        </button>
                    </div>
                }
            >
                <div className="text-left space-y-4">
                    <p className="text-[13px] text-slate-600">
                        Processing <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(grandTotal)}</span> for {items.length} item{items.length === 1 ? '' : 's'}.
                    </p>

                    {/* Top toggle: Shipped (dispatch) vs Mark as Delivered (done now) */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">How is this fulfilled?</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setFinalizeMode('shipped')}
                                className={`h-10 rounded-lg border text-[12.5px] font-bold transition-all ${finalizeMode === 'shipped' ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-[#F59E0B]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>Shipped</button>
                            <button type="button" onClick={() => setFinalizeMode('delivered')}
                                className={`h-10 rounded-lg border text-[12.5px] font-bold transition-all ${finalizeMode === 'delivered' ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-[#F59E0B]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>Mark as Delivered</button>
                        </div>
                    </div>

                    {finalizeMode === 'shipped' && (
                        <>
                            {/* Auto pickup (branch) + delivery (customer) */}
                            {(() => { const wh = warehouses.find((w: any) => String(w.id) === String(warehouseId)); return (
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1"><MapPin size={12} /> Pickup</div>
                                        <p className="text-[12.5px] font-semibold text-slate-800">{wh?.name || 'Branch'}</p>
                                        {wh?.location && <p className="text-[11px] text-slate-500">{wh.location}</p>}
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 uppercase tracking-widest"><MapPin size={12} /> Delivery</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input value={deliveryCustomerName} onChange={e => setDeliveryCustomerName(e.target.value)} placeholder="Customer name"
                                                className="h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#F59E0B] bg-white" />
                                            <input value={deliveryCustomerPhone} onChange={e => setDeliveryCustomerPhone(e.target.value)} placeholder="Phone"
                                                className="h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#F59E0B] bg-white" />
                                        </div>
                                        <textarea rows={2} value={deliveryCustomerAddress} onChange={e => setDeliveryCustomerAddress(e.target.value)} placeholder="Delivery address"
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#F59E0B] bg-white resize-none" />
                                    </div>
                                </div>
                            ); })()}

                            {/* Who delivers: specific rider vs all riders */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Who delivers this?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setShipMode('specific')}
                                        className={`h-10 rounded-lg border text-[12px] font-bold transition-all ${shipMode === 'specific' ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-[#F59E0B]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>Specific rider</button>
                                    <button type="button" onClick={() => setShipMode('all')}
                                        className={`h-10 rounded-lg border text-[12px] font-bold transition-all ${shipMode === 'all' ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-[#F59E0B]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>All riders</button>
                                </div>
                            </div>
                            {shipMode === 'specific' ? (
                                <select value={selectedRider} onChange={e => setSelectedRider(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-800 outline-none focus:border-[#F59E0B] bg-white">
                                    <option value="">— Select a rider —</option>
                                    {[...riders].sort((a: any, b: any) => (b.is_system ? 1 : 0) - (a.is_system ? 1 : 0)).map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.is_system ? '★ ' : ''}{r.name}{r.is_system ? ' · system' : ''}{r.phone ? ` · ${r.phone}` : ''}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-[11px] text-slate-500 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 leading-snug">Offered to every branch rider — the first to accept gets the delivery.</p>
                            )}

                            {/* Delivery price offered — hidden for a System (salaried) rider */}
                            {!(shipMode === 'specific' && riders.find((r: any) => String(r.id) === selectedRider)?.is_system) && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery price you offer (Rs)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                                        <input type="number" min="0" step="0.01" value={shipFee} onChange={e => setShipFee(e.target.value)} placeholder="0.00"
                                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] bg-white" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Modal>

            {/* ── Stock Error Modal ── */}
            <Modal
                open={!!stockError}
                onClose={() => setStockError(null)}
                title="Inventory Issue"
                size="md"
                footer={
                    <Button variant="primary" onClick={() => setStockError(null)}>
                        Dismiss
                    </Button>
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
                    This branch doesn't have enough units for this order. Please adjust the quantities.
                </p>
            </Modal>
        </div>
    );
}
