"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Trash2, X, CheckCircle, Package, ArrowLeft,
    RefreshCw, Search, ChevronDown, User,
    Printer, Loader2, AlertTriangle, ShieldCheck, History, MapPin, Phone, ScanLine
} from 'lucide-react';
import { productService, orderService, userService, companyService, inventoryService } from '@/lib/api';
import { installmentService } from '@/services/payment.service';
import { deliveryService } from '@/services/delivery.service';
import { authService } from '@/lib/auth';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Card, Button, Modal, ui } from '@/components/admin/ui';
import {
    cellCls, cellNum, Th, Cell,
    gridScroller, gridHead, gridFoot, gridRow,
} from '@/components/admin/ui/grid';
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

/* Line-item grid — same shape as New Purchase, with the POS's own columns:
   product, stock, qty, bonus, rate, discount, net, remove. */

type SaleItem = {
    product: string;
    product_name: string;
    quantity: number;        // total units (packs x packing + loose units)
    unit_price: number;      // Unit TP (editable sale rate)
    bonus: number;           // Bon(U) — free units
    discountPct: number;     // per-line Disct %
    cost: number;            // snapshot cost for profit calc
    stock: number;
    weight?: string;
    size?: string;
    // Desktop (Trade 1.0) columns. Display/entry only — the save payload is
    // unchanged, so these do not reach the backend.
    expiry?: string;
    retail?: number;
    packing?: number;
    company_name?: string;
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

    // Source warehouse = the logged-in branch admin's own organization. There's no picker;
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



    // Charged net for a line: qty × rate − line discount (bonus units are free).
    const lineNet = (it: SaleItem) => {
        const gross = (parseInt(it.quantity as any) || 0) * (parseFloat(it.unit_price as any) || 0);
        const disc = gross * ((parseFloat(it.discountPct as any) || 0) / 100);
        return Math.max(0, gross - disc);
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

    /* Column sums shown in the totals band. */
    const totalUnitsSold = items.reduce((s, it) => s + (parseInt(it.quantity as any) || 0), 0);
    const totalBonusUnits = items.reduce((s, it) => s + (parseInt(it.bonus as any) || 0), 0);

    /* In-grid keyboard movement, mirroring the purchase screen: Enter steps to the
       next cell (adding a line past the end), arrows move by row. Reads live DOM
       order so it never needs a hardcoded column count. */



    // Don't let a reload silently bin a cart that has lines on it.
    useEffect(() => {
        if (!cartHasContent || successOrder) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [cartHasContent, successOrder]);


    /* ═══ Desktop-style entry row ═══
       The Trade 1.0 screen works entry-row-then-Add rather than inline editing:
       you resolve a product, fill quantities/rates above, press Add, and the line
       drops into the grid. `items` stays the source of truth so the save payload,
       stock checks and totals are unchanged. */
    const EMPTY_ENTRY = {
        productId: '', code: '', name: '', company: '', stock: 0, cost: 0,
        qtyP: 0, qtyU: 0, packing: 1, bonus: 0, tp: 0, discPct: 0, retail: 0, expiry: '',
    };
    const [entry, setEntry] = useState({ ...EMPTY_ENTRY });
    const [selectedLine, setSelectedLine] = useState<number>(-1);

    // Popups
    const [showFindCustomer, setShowFindCustomer] = useState(false);
    const [custSearch, setCustSearch] = useState('');
    const [showRecords, setShowRecords] = useState(false);
    const [recFrom, setRecFrom] = useState('');
    const [recTo, setRecTo] = useState('');
    const [recStaff, setRecStaff] = useState('');
    const [recType, setRecType] = useState('');
    const [recRows, setRecRows] = useState<any[]>([]);
    const [recLoading, setRecLoading] = useState(false);

    const LINE_COLS = 'grid grid-cols-[54px_90px_minmax(180px,2fr)_98px_72px_70px_84px_84px_96px_66px_88px_104px_38px]';
    const LINE_MIN = 'min-w-[1180px]';
    const REC_COLS = 'grid grid-cols-[110px_100px_minmax(110px,1fr)_90px_minmax(140px,1.4fr)_92px_80px_100px_92px_92px_92px_96px] min-w-[1180px]';

    // Packing comes from the branch stock row (items_per_carton); products carry no
    // pack size of their own, so it falls back to 1 = loose units.
    const packingFor = (p: any) => {
        const row: any = warehouseStock.find((s: any) =>
            (s.product_name || '').toLowerCase().trim() === (p?.product_name || p?.name || '').toLowerCase().trim());
        return Math.max(1, Number(row?.items_per_carton || 0) || 1);
    };

    const loadEntryFromProduct = (p: any) => {
        if (!p) return;
        setEntry({
            ...EMPTY_ENTRY,
            productId: String(p.id),
            code: p.barcode || p.sku || '',
            name: p.product_name || p.name || '',
            company: p.company_name || p.company || '',
            stock: Number(p.total_quantity ?? p.stock_quantity ?? 0),
            cost: parseFloat(p.cost_price || 0),
            packing: packingFor(p),
            tp: parseFloat(p.selling_price || p.price || 0),
            retail: parseFloat(p.retail_price || 0),
        });
    };

    const entryTotalUnits = (entry.qtyP || 0) * (entry.packing || 1) + (entry.qtyU || 0);
    const entryGross = entryTotalUnits * (entry.tp || 0);
    const entryDiscAmt = entryGross * ((entry.discPct || 0) / 100);
    const entrySubTotal = Math.max(0, entryGross - entryDiscAmt);
    const entryProfit = entrySubTotal - entryTotalUnits * (entry.cost || 0);
    const entryProfitPct = entry.cost > 0 ? (entryProfit / (entryTotalUnits * entry.cost)) * 100 : 0;

    const addEntryToGrid = () => {
        if (!entry.productId) return toast.error('Pick a product first.');
        if (entryTotalUnits < 1) return toast.error('Enter a quantity.');
        if (entry.stock > 0 && entryTotalUnits > entry.stock) {
            return toast.error(`Only ${entry.stock} units in stock.`);
        }
        const line: SaleItem = {
            product: entry.productId,
            product_name: entry.name,
            quantity: entryTotalUnits,
            unit_price: entry.tp,
            bonus: entry.bonus,
            discountPct: entry.discPct,
            cost: entry.cost,
            stock: entry.stock,
            expiry: entry.expiry,
            retail: entry.retail,
            packing: entry.packing,
            company_name: entry.company,
        };
        setItems(prev => {
            const blank = prev.findIndex(it => !it.product);
            if (blank >= 0) return prev.map((x, i) => i === blank ? line : x);
            return [...prev, line];
        });
        setEntry({ ...EMPTY_ENTRY });
        barcodeRef.current?.focus();
    };

    const removeLine = (i: number) => {
        if (i < 0) return;
        setItems(prev => {
            const withProducts = prev.filter(it => it.product);
            if (withProducts.length <= 1) return [{ ...EMPTY_SALE_ITEM }];
            return prev.filter((_, idx) => idx !== i);
        });
        setSelectedLine(-1);
    };

    // Only lines that actually carry a product are shown/summed in the desktop grid.
    const lineRows = items.filter(it => it.product).map(it => {
        const qty = parseInt(it.quantity as any) || 0;
        const gross = qty * (parseFloat(it.unit_price as any) || 0);
        const discAmt = gross * ((parseFloat(it.discountPct as any) || 0) / 100);
        return {
            pid: String(it.product).slice(0, 8),
            name: it.product_name,
            expiry: it.expiry || '',
            qty,
            bonus: parseInt(it.bonus as any) || 0,
            tp: parseFloat(it.unit_price as any) || 0,
            retail: parseFloat((it as any).retail || 0),
            subTotal: gross,
            discPct: parseFloat(it.discountPct as any) || 0,
            discAmt,
            netAmt: Math.max(0, gross - discAmt),
        };
    });
    const lineDiscTotal = lineRows.reduce((s, r) => s + r.discAmt, 0);

    const startNewInvoice = () => {
        if (cartHasContent && !window.confirm('Discard the current invoice and start a new one?')) return;
        setItems([{ ...EMPTY_SALE_ITEM }]);
        setEntry({ ...EMPTY_ENTRY });
        setCustomerId(''); setGuestName(''); setGuestPhone('');
        setDiscountVal(''); setAmountTendered(''); setAmountPaidNow('');
        setPayMode('full'); setSelectedLine(-1); setShowErrors(false);
        setOrderNumber(`SAL-${Date.now().toString().slice(-6)}`);
        barcodeRef.current?.focus();
    };

    /* ── Find Account popup ── */
    const customerLabel = (c: any) =>
        c?.full_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || c?.username || c?.email || 'Unnamed';

    const filteredCustomers = (() => {
        const q = custSearch.trim().toLowerCase();
        if (!q) return users;
        return users.filter((c: any) =>
            customerLabel(c).toLowerCase().includes(q) ||
            String(c.phone ?? '').toLowerCase().includes(q) ||
            String(c.area_name ?? '').toLowerCase().includes(q));
    })();

    const selectedCustomerLabel = (() => {
        if (!customerId) return '';
        const c = users.find((u: any) => String(u.id) === String(customerId));
        return c ? customerLabel(c) : '';
    })();

    const pickCustomer = (c: any) => {
        setCustomerId(String(c.id));
        setShowFindCustomer(false);
        setCustSearch('');
    };

    /* ── Sale / Sale-Return records popup ── */
    const loadRecords = async () => {
        setRecLoading(true);
        try {
            const params: any = { no_pagination: true };
            if (recFrom) params.date_from = recFrom;
            if (recTo) params.date_to = recTo;
            if (recStaff) params.salesperson = recStaff;
            const res: any = await orderService.getAll(params);
            let rows: any[] = res?.results ?? res ?? [];
            // The API has no sale-vs-return flag, so narrow client-side on the fields
            // that do exist rather than showing an unfiltered list under a filter label.
            if (recType === 'return') rows = rows.filter((r: any) => Number(r.total_amount || 0) < 0 || r.is_return);
            if (recType === 'sale') rows = rows.filter((r: any) => !(Number(r.total_amount || 0) < 0 || r.is_return));
            if (recFrom) rows = rows.filter((r: any) => ((r.sale_date || r.created_at || '') as string).slice(0, 10) >= recFrom);
            if (recTo) rows = rows.filter((r: any) => ((r.sale_date || r.created_at || '') as string).slice(0, 10) <= recTo);
            setRecRows(rows);
            if (rows.length === 0) toast('No records in that range.', { icon: 'ℹ️' });
        } catch {
            toast.error('Could not load sale records.');
            setRecRows([]);
        } finally {
            setRecLoading(false);
        }
    };

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
            <div className="max-w-[1400px] mx-auto px-0 sm:px-5 pt-1 sm:pt-4">

                {/* Breadcrumb + record actions */}
                <div className="flex items-center justify-between gap-4 mb-3">
                    <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 min-w-0">
                        <button
                            onClick={() => router.push('/admin/sales')}
                            title="Back to Sales"
                            aria-label="Back to Sales"
                            className="w-7 h-7 mr-1 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#B4780B] hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 flex items-center justify-center transition-colors shadow-sm"
                        >
                            <ArrowLeft size={15} />
                        </button>
                        <button onClick={() => router.push('/admin/dashboard')} className="hover:text-slate-600 transition-colors">Console</button>
                        <span className="text-slate-300">/</span>
                        <button onClick={() => router.push('/admin/sales')} className="hover:text-slate-600 transition-colors">Sales History</button>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600 truncate">Sale Invoice</span>
                    </nav>
                    <div className="flex items-center gap-2 shrink-0">
                        <Btn variant="secondary" onClick={holdSale} disabled={!cartHasContent} className="font-bold">Hold</Btn>
                        <Btn variant="secondary" onClick={() => { setRecFrom(orderDate); setRecTo(orderDate); setShowRecords(true); }} className="font-bold">
                            <History size={14} /> View Records
                        </Btn>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-slate-500 font-medium animate-pulse flex flex-col items-center gap-4">
                        <Loader2 size={32} className="animate-spin text-[#B4780B]" />
                        Syncing Terminal Catalog...
                    </div>
                ) : (
                    <div className="space-y-3">

                        {/* ═══ CUSTOMER / PRODUCT STRIP ═══ */}
                        <Card className="overflow-hidden">
                            <div className="px-3 sm:px-4 py-3 border-b border-slate-200 bg-slate-50/70 grid grid-cols-1 lg:grid-cols-[auto_minmax(180px,1fr)_minmax(240px,2fr)_150px] gap-2.5 items-end">
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Customer</label>
                                    <Btn variant="secondary" onClick={() => setShowFindCustomer(true)} className="font-bold w-full lg:w-auto">
                                        <Search size={13} /> Find Customer
                                    </Btn>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Account</label>
                                    <input
                                        readOnly
                                        value={selectedCustomerLabel}
                                        placeholder="Walk-in"
                                        onClick={() => setShowFindCustomer(true)}
                                        className={cellCls + ' cursor-pointer bg-[#F59E0B]/5 border-[#F59E0B]/30'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Product</label>
                                    <ProductSelector
                                        selectedId={entry.productId}
                                        products={branchProducts}
                                        inputCls={cellCls}
                                        onSelect={(p: any) => loadEntryFromProduct(p)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Stock</label>
                                    <input readOnly value={entry.productId ? String(entry.stock) : ''} className={cellCls + ' text-right ' + (entry.productId && entry.stock <= 0 ? 'text-rose-600' : 'text-slate-700')} />
                                </div>
                            </div>

                            {/* ═══ ENTRY ROW ═══ */}
                            <div className="overflow-x-auto custom-scrollbar">
                                <div className="min-w-[1150px] grid grid-cols-[86px_minmax(120px,1fr)_78px_78px_88px_78px_78px_92px_78px_96px_92px_104px] gap-1.5 px-3 sm:px-4 py-3 items-end">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">&nbsp;</label>
                                        <Btn variant="secondary" onClick={() => barcodeRef.current?.focus()} className="w-full font-bold">Find</Btn>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Product Code</label>
                                        <input
                                            ref={barcodeRef}
                                            value={entry.code}
                                            onChange={e => setEntry(v => ({ ...v, code: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key !== 'Enter') return;
                                                e.preventDefault();
                                                const p: any = findByCode(entry.code);
                                                if (p) loadEntryFromProduct(p);
                                                else toast.error(`No product matches "${entry.code}"`, { id: 'code-miss' });
                                            }}
                                            placeholder="scan / code"
                                            className={cellCls + ' bg-[#F59E0B]/5 border-[#F59E0B]/40'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Qty (P)</label>
                                        <input type="number" min="0" className={cellNum} value={entry.qtyP || ''} placeholder="0"
                                            onChange={e => setEntry(v => ({ ...v, qtyP: Math.max(0, parseInt(e.target.value) || 0) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Qty (U)</label>
                                        <input type="number" min="0" className={cellNum} value={entry.qtyU || ''} placeholder="0"
                                            onChange={e => setEntry(v => ({ ...v, qtyU: Math.max(0, parseInt(e.target.value) || 0) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Total Units</label>
                                        <input readOnly className={cellNum + ' bg-slate-100 font-black text-[#B4780B]'} value={entryTotalUnits || ''} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Packing</label>
                                        <input type="number" min="1" className={cellNum} value={entry.packing || ''} placeholder="1"
                                            onChange={e => setEntry(v => ({ ...v, packing: Math.max(1, parseInt(e.target.value) || 1) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Bon (U)</label>
                                        <input type="number" min="0" className={cellNum + ' text-emerald-700'} value={entry.bonus || ''} placeholder="0"
                                            onChange={e => setEntry(v => ({ ...v, bonus: Math.max(0, parseInt(e.target.value) || 0) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Unit TP</label>
                                        <input type="number" min="0" step="0.01" className={cellNum} value={entry.tp || ''} placeholder="0.00"
                                            onChange={e => setEntry(v => ({ ...v, tp: Math.max(0, parseFloat(e.target.value) || 0) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Disct %</label>
                                        <input type="number" min="0" max="100" className={cellNum} value={entry.discPct || ''} placeholder="0"
                                            onChange={e => setEntry(v => ({ ...v, discPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Retail Rate</label>
                                        <input type="number" min="0" step="0.01" className={cellNum} value={entry.retail || ''} placeholder="0.00"
                                            onChange={e => setEntry(v => ({ ...v, retail: Math.max(0, parseFloat(e.target.value) || 0) }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Disc Amt.</label>
                                        <input readOnly className={cellNum + ' bg-slate-100 text-rose-600 font-bold'} value={entryDiscAmt ? entryDiscAmt.toFixed(2) : ''} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1">Sub Total</label>
                                        <input readOnly className={cellNum + ' bg-slate-100 font-black text-[#B4780B]'} value={entrySubTotal ? entrySubTotal.toFixed(2) : ''} />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* ═══ GRID + RIGHT PANEL ═══ */}
                        <div className="flex flex-col xl:flex-row gap-3 items-start">

                            <Card className="flex-1 min-w-0 overflow-hidden w-full">
                                <div className={gridScroller}>
                                    <div className={LINE_COLS + ' ' + LINE_MIN + ' ' + gridHead}>
                                        <Th align="right">SNo</Th>
                                        <Th>PID</Th>
                                        <Th>Product Name</Th>
                                        <Th>Expiry</Th>
                                        <Th align="right">Qty</Th>
                                        <Th align="right">Bonus</Th>
                                        <Th align="right">TP</Th>
                                        <Th align="right">Retail</Th>
                                        <Th align="right">SubTotal</Th>
                                        <Th align="right">Disc%</Th>
                                        <Th align="right">Dis.Amt</Th>
                                        <Th align="right">Net Amt</Th>
                                        <Th> </Th>
                                    </div>

                                    {lineRows.length === 0 && (
                                        <div className={LINE_MIN + ' py-14 text-center text-[12.5px] text-slate-400'}>
                                            Pick a product above, fill the entry row, then press <b className="text-slate-600">Add</b>.
                                        </div>
                                    )}

                                    {lineRows.map((r, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedLine(i)}
                                            className={gridRow(i) + (selectedLine === i ? ' !bg-[#F59E0B]/15' : '') + ' cursor-pointer'}
                                        >
                                            <div className={LINE_COLS + ' ' + LINE_MIN}>
                                                <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-slate-500">{i + 1}</span></Cell>
                                                <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-500 truncate">{r.pid}</span></Cell>
                                                <Cell><span className="px-1 text-[12.5px] font-semibold text-slate-800 truncate">{r.name}</span></Cell>
                                                <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-500">{r.expiry || '—'}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] font-bold tabular-nums text-[#B4780B]">{r.qty}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-emerald-700">{r.bonus || ''}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-slate-700">{r.tp.toFixed(2)}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-slate-500">{r.retail ? r.retail.toFixed(2) : '—'}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-slate-700">{r.subTotal.toFixed(2)}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-slate-500">{r.discPct || ''}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] tabular-nums text-rose-600">{r.discAmt ? r.discAmt.toFixed(2) : ''}</span></Cell>
                                                <Cell className="justify-end"><span className="px-1 text-[12.5px] font-black tabular-nums text-[#B4780B]">{r.netAmt.toFixed(2)}</span></Cell>
                                                <Cell className="justify-center">
                                                    <button
                                                        onClick={(ev) => { ev.stopPropagation(); removeLine(i); }}
                                                        title="Remove line"
                                                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Cell>
                                            </div>
                                        </div>
                                    ))}

                                    {lineRows.length > 0 && (
                                        <div className={LINE_COLS + ' ' + LINE_MIN + ' ' + gridFoot}>
                                            <div className="px-2 py-2 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 border-r border-slate-200/80 col-span-4">Totals</div>
                                            <div className="px-2 py-2 text-[12px] font-black text-slate-800 tabular-nums text-right border-r border-slate-200/80">{totalUnitsSold}</div>
                                            <div className="px-2 py-2 text-[12px] font-black text-emerald-700 tabular-nums text-right border-r border-slate-200/80">{totalBonusUnits || ''}</div>
                                            <div className="border-r border-slate-200/80 col-span-3" />
                                            <div className="border-r border-slate-200/80" />
                                            <div className="px-2 py-2 text-[12px] font-black text-rose-600 tabular-nums text-right border-r border-slate-200/80">{lineDiscTotal ? lineDiscTotal.toFixed(2) : ''}</div>
                                            <div className="px-2 py-2 text-[12.5px] font-black text-[#B4780B] tabular-nums text-right whitespace-nowrap col-span-2">{formatCurrency(totalBill)}</div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* RIGHT PANEL — invoice meta + add/remove + profit */}
                            <Card className="w-full xl:w-[320px] shrink-0 overflow-hidden">
                                <div className="p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Amount</span>
                                        <span className="text-[15px] font-black tabular-nums text-[#B4780B]">{formatCurrency(entrySubTotal)}</span>
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Expiry Date</label>
                                        <input type="date" className={cellCls + ' tabular-nums'} value={entry.expiry}
                                            onChange={e => setEntry(v => ({ ...v, expiry: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Company</label>
                                        <input readOnly className={cellCls + ' bg-slate-100'} value={entry.company} placeholder="—" />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Invoice No.</label>
                                        <input readOnly className={cellCls + ' bg-[#F59E0B]/10 border-[#F59E0B]/30 font-black text-[#B4780B] tabular-nums'} value={orderNumber} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <Btn onClick={addEntryToGrid} className="justify-center font-bold">Add</Btn>
                                        <Btn variant="secondary" onClick={() => removeLine(selectedLine)} disabled={selectedLine < 0} className="justify-center font-bold">Remove</Btn>
                                    </div>

                                    <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
                                        <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500">Product PR</div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Pur. Rate</span>
                                                <input readOnly className={cellNum + ' bg-slate-100'} value={entry.cost ? entry.cost.toFixed(2) : ''} />
                                            </div>
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Profit</span>
                                                <input readOnly className={cellNum + ' bg-slate-100 ' + (entryProfit >= 0 ? 'text-emerald-700' : 'text-rose-600')} value={entry.productId ? entryProfit.toFixed(2) : ''} />
                                            </div>
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Profit %</span>
                                                <input readOnly className={cellNum + ' bg-slate-100 ' + (entryProfitPct >= 0 ? 'text-emerald-700' : 'text-rose-600')} value={entry.productId && entry.cost > 0 ? entryProfitPct.toFixed(1) : ''} />
                                            </div>
                                        </div>

                                        <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 pt-1">Invoice PV</div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Pur. Value</span>
                                                <input readOnly className={cellNum + ' bg-slate-100'} value={totalCost ? totalCost.toFixed(2) : '0'} />
                                            </div>
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Profit</span>
                                                <input readOnly className={cellNum + ' bg-slate-100 ' + (invoiceProfit >= 0 ? 'text-emerald-700' : 'text-rose-600')} value={invoiceProfit.toFixed(2)} />
                                            </div>
                                            <div>
                                                <span className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">Profit %</span>
                                                <input readOnly className={cellNum + ' bg-slate-100 ' + (profitPct >= 0 ? 'text-emerald-700' : 'text-rose-600')} value={totalCost > 0 ? profitPct.toFixed(1) : ''} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-bold text-white">
                                        Total Products = <span className="tabular-nums">{lineRows.length}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* ═══ BOTTOM TOTALS BAR ═══ */}
                        <Card className="overflow-hidden">
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200">
                                {[
                                    { label: 'Amount Billed', value: totalBill, tone: 'text-slate-900' },
                                    { label: 'Total Disc By%', value: discountAmount, tone: 'text-rose-600' },
                                    { label: 'Net Amount', value: grandTotal, tone: 'text-[#B4780B]' },
                                    { label: 'Prev. Bal', value: prevBalance, tone: 'text-slate-700' },
                                    { label: 'Net Balance', value: grandTotal + prevBalance - paidNow, tone: 'text-emerald-700' },
                                ].map(c => (
                                    <div key={c.label} className="bg-white px-3 py-2.5">
                                        <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500">{c.label}</div>
                                        <div className={`text-[16px] font-black tabular-nums ${c.tone}`}>{formatCurrency(c.value)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-3 sm:px-4 py-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[150px_150px_minmax(160px,1fr)_150px_1fr] gap-2.5 items-end">
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Paid Cash</label>
                                    <input type="number" min="0" className={cellNum} placeholder="0.00"
                                        value={payMode === 'full' ? String(grandTotal || '') : amountPaidNow}
                                        onChange={e => { setPayMode('partial'); setAmountPaidNow(e.target.value); }} />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Discount</label>
                                    <div className="flex gap-1">
                                        <input type="number" min="0" className={cellNum} placeholder="0" value={discountVal}
                                            onChange={e => setDiscountVal(e.target.value)} />
                                        <button
                                            onClick={() => setDiscountType(discountType === 'flat' ? 'percent' : 'flat')}
                                            title="Toggle flat / percent"
                                            className="shrink-0 w-9 h-9 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-600 hover:border-[#F59E0B]/50 hover:text-[#B4780B] transition-colors"
                                        >
                                            {discountType === 'percent' ? '%' : 'Rs'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Saleman</label>
                                    <select className={cellCls + ' cursor-pointer'} value={salesperson} onChange={e => setSalesperson(e.target.value)}>
                                        <option value="">Select any one</option>
                                        {staffList.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Sale Date</label>
                                    <input type="date" className={cellCls + ' tabular-nums'} value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                                </div>
                                <div className="flex flex-wrap items-end justify-end gap-2">
                                    <Btn variant="secondary" onClick={startNewInvoice} className="font-bold">New Invoice</Btn>
                                    <Btn
                                        onClick={() => {
                                            const bad = firstInvalidRow();
                                            if (bad) { setShowErrors(true); return toast.error(bad.msg); }
                                            if (!warehouseId) return toast.error('Please select a source warehouse');
                                            setShowErrors(false);
                                            setShowConfirm(true);
                                        }}
                                        loading={saving}
                                        disabled={lineRows.length === 0}
                                        className="font-bold px-6"
                                    >
                                        <CheckCircle size={15} /> Save
                                    </Btn>
                                    <Btn variant="secondary" onClick={() => { setRecFrom(orderDate); setRecTo(orderDate); setShowRecords(true); }} className="font-bold">View</Btn>
                                    <Btn variant="secondary" onClick={() => router.push('/admin/sales')} className="font-bold">Close</Btn>
                                </div>
                            </div>

                            {/* Walk-in details, kept from the web build — the desktop app has no
                                equivalent, but a sale with no registered account still needs a name. */}
                            {!customerId && (
                                <div className="px-3 sm:px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Walk-in Name</label>
                                        <input className={cellCls} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Adnan Ali" />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Walk-in Contact</label>
                                        <input className={cellCls} value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="e.g. 03xx-xxxxxxx" />
                                    </div>
                                    <div>
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Payment Method</label>
                                        <select className={cellCls + ' cursor-pointer'} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                            <option value="cash">Cash</option>
                                            <option value="online">Online Transfer</option>
                                        </select>
                                    </div>
                                    {payMode !== 'full' && (
                                        <div>
                                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Balance Due Date</label>
                                            <input type="date" className={cellCls + ' tabular-nums'} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cash drawer maths */}
                            {paymentMethod === 'cash' && amountCollectable > 0 && (
                                <div className="px-3 sm:px-4 pb-3.5 flex flex-wrap items-end gap-2.5">
                                    <div className="w-[160px]">
                                        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Cash Received</label>
                                        <input type="number" min={0} className={cellNum} value={amountTendered} placeholder="0.00"
                                            onChange={e => setAmountTendered(e.target.value)} />
                                    </div>
                                    <div className="flex gap-1.5 pb-0.5">
                                        <button type="button" onClick={() => setAmountTendered(String(amountCollectable))}
                                            className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-[#F59E0B]/50 hover:text-[#B4780B] transition-colors">Exact</button>
                                        {[500, 1000, 5000].map(d => (
                                            <button key={d} type="button" onClick={() => setAmountTendered(String(d))}
                                                className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-[#F59E0B]/50 hover:text-[#B4780B] transition-colors tabular-nums">{d}</button>
                                        ))}
                                    </div>
                                    {tendered > 0 && (
                                        <div className={`px-3 py-2 rounded-lg ${tenderShort ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                                            <span className={`text-[10.5px] font-black uppercase tracking-wider mr-2 ${tenderShort ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                {tenderShort ? 'Short by' : 'Change due'}
                                            </span>
                                            <span className={`text-[15px] font-black tabular-nums ${tenderShort ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                {formatCurrency(tenderShort ? amountCollectable - tendered : changeDue)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {heldSales.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 px-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Held</span>
                                {heldSales.map((h: any) => (
                                    <button key={h.id} onClick={() => resumeSale(h)}
                                        title={`Resume sale held at ${h.heldAtLabel}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[11.5px] font-bold text-[#B4780B] hover:bg-[#F59E0B]/20 transition-colors">
                                        {h.heldAtLabel} · {formatCurrency(h.total)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Find Customer (Find Account) ── */}
            <Modal open={showFindCustomer} onClose={() => setShowFindCustomer(false)} title="Find Account" size="xl">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[220px]">
                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Account Name</label>
                            <input
                                autoFocus
                                value={custSearch}
                                onChange={e => setCustSearch(e.target.value)}
                                placeholder="Type to filter accounts…"
                                className={cellCls + ' bg-[#F59E0B]/5 border-[#F59E0B]/30'}
                            />
                        </div>
                        <Btn variant="secondary" onClick={() => router.push('/admin/company/customers/add')} className="font-bold">Add New</Btn>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[110px_minmax(160px,1.6fr)_minmax(110px,1fr)_110px_110px] bg-slate-100 border-b border-slate-300">
                            <Th>Account ID</Th>
                            <Th>Account Name</Th>
                            <Th>Area</Th>
                            <Th>Acc. 2nd Level</Th>
                            <Th>Acc. 3rd Level</Th>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                            {filteredCustomers.length === 0 && (
                                <div className="py-10 text-center text-[12.5px] text-slate-400">No accounts match.</div>
                            )}
                            {filteredCustomers.map((c: any, i: number) => (
                                <div
                                    key={c.id}
                                    onDoubleClick={() => pickCustomer(c)}
                                    onClick={() => pickCustomer(c)}
                                    className={'grid grid-cols-[110px_minmax(160px,1.6fr)_minmax(110px,1fr)_110px_110px] cursor-pointer border-b border-slate-100 last:border-b-0 ' + (i % 2 ? 'bg-slate-50/40 ' : 'bg-white ') + 'hover:bg-[#F59E0B]/10'}
                                >
                                    <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-500 truncate">{String(c.id).slice(0, 8)}</span></Cell>
                                    <Cell><span className="px-1 text-[12.5px] font-semibold text-slate-800 truncate">{customerLabel(c)}</span></Cell>
                                    <Cell><span className="px-1 text-[12px] text-slate-600 truncate">{c.area_name || c.city || '—'}</span></Cell>
                                    <Cell><span className="px-1 text-[12px] text-slate-400">—</span></Cell>
                                    <Cell><span className="px-1 text-[12px] text-slate-400">—</span></Cell>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                        <button
                            onClick={() => { setCustomerId(''); setShowFindCustomer(false); }}
                            className="text-[12.5px] font-bold text-slate-500 hover:text-slate-800 hover:underline"
                        >
                            Clear (walk-in)
                        </button>
                        <Btn variant="secondary" onClick={() => setShowFindCustomer(false)} className="font-bold px-6">Cancel</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── Sale / Sale-Return Records ── */}
            <Modal open={showRecords} onClose={() => setShowRecords(false)} title="Sale / Sale-Return Records" size="xl">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2.5 items-end">
                        <div>
                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">From Sale Date</label>
                            <input type="date" className={cellCls + ' tabular-nums'} value={recFrom} onChange={e => setRecFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">To Sale Date</label>
                            <input type="date" className={cellCls + ' tabular-nums'} value={recTo} onChange={e => setRecTo(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Staff</label>
                            <select className={cellCls + ' cursor-pointer'} value={recStaff} onChange={e => setRecStaff(e.target.value)}>
                                <option value="">Select any one</option>
                                {staffList.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1">Sale / Sale Return</label>
                            <select className={cellCls + ' cursor-pointer'} value={recType} onChange={e => setRecType(e.target.value)}>
                                <option value="">Select any one</option>
                                <option value="sale">Sale</option>
                                <option value="return">Sale Return</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Btn onClick={loadRecords} loading={recLoading} className="font-bold flex-1 justify-center">Search</Btn>
                            <Btn variant="secondary" onClick={() => setShowRecords(false)} className="font-bold flex-1 justify-center">Cancel</Btn>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <div className={REC_COLS + ' bg-slate-100 border-b border-slate-300'}>
                                <Th>SaleID</Th>
                                <Th>Date Sale</Th>
                                <Th>Staff</Th>
                                <Th>Acc.ID</Th>
                                <Th>Acc.Name</Th>
                                <Th align="right">Amount</Th>
                                <Th align="right">Disc.</Th>
                                <Th align="right">Net.Amount</Th>
                                <Th align="right">Pre. Bal.</Th>
                                <Th align="right">Total</Th>
                                <Th align="right">Paid</Th>
                                <Th align="right">Balance</Th>
                            </div>
                            <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                                {recRows.length === 0 && (
                                    <div className="py-10 text-center text-[12.5px] text-slate-400">
                                        {recLoading ? 'Searching…' : 'No records — pick a date range and press Search.'}
                                    </div>
                                )}
                                {recRows.map((r: any, i: number) => {
                                    const amount = Number(r.total_amount || 0);
                                    const disc = Number(r.discount || 0);
                                    const paid = Number(r.amount_paid ?? r.paid_amount ?? 0);
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => router.push(`/admin/sales/${r.id}/invoice`)}
                                            className={REC_COLS + ' cursor-pointer border-b border-slate-100 last:border-b-0 ' + (i % 2 ? 'bg-slate-50/40 ' : 'bg-white ') + 'hover:bg-[#F59E0B]/10'}
                                        >
                                            <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-500 truncate">{r.order_number || String(r.id).slice(0, 8)}</span></Cell>
                                            <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-600">{(r.sale_date || r.created_at || '').slice(0, 10)}</span></Cell>
                                            <Cell><span className="px-1 text-[12px] text-slate-600 truncate">{r.salesperson_name || '—'}</span></Cell>
                                            <Cell><span className="px-1 text-[11.5px] tabular-nums text-slate-500 truncate">{r.customer ? String(r.customer).slice(0, 8) : '—'}</span></Cell>
                                            <Cell><span className="px-1 text-[12px] font-semibold text-slate-800 truncate">{r.customer_name || 'Walk-in'}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-slate-700">{amount.toFixed(2)}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-rose-600">{disc ? disc.toFixed(2) : ''}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] font-bold tabular-nums text-[#B4780B]">{amount.toFixed(2)}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-slate-400">—</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-slate-700">{amount.toFixed(2)}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] tabular-nums text-emerald-700">{paid.toFixed(2)}</span></Cell>
                                            <Cell className="justify-end"><span className="px-1 text-[12px] font-bold tabular-nums text-rose-600">{Math.max(0, amount - paid).toFixed(2)}</span></Cell>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

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
                                        <p className="text-[12.5px] font-semibold text-slate-800">{wh?.name || 'Organization'}</p>
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
                                <p className="text-[11px] text-slate-500 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 leading-snug">Offered to every organization rider — the first to accept gets the delivery.</p>
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
                    This organization doesn't have enough units for this order. Please adjust the quantities.
                </p>
            </Modal>
        </div>
    );
}
