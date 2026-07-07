'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle, Package, ArrowLeft, RefreshCw, Search, ChevronDown, Building2, PackagePlus } from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { inventoryService } from '@/services/inventory.service';
import { supplierService } from '@/services/supplier.service';
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
        <label className="block text-[12px] font-bold text-slate-700 mb-1">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase
    .replace('h-10', 'h-9')
    .replace('text-[13.5px]', 'text-[12.5px]');
const selectCls = `${inputCls} cursor-pointer`;

const EMPTY_FORM = {
    purchase_number: '', supplier: '', supplier_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'PENDING', payment_method: 'CASH', notes: '',
    shipping_cost: 0,
    tax_rate: 0,
    warehouse: '',
    // Optional initial settlement at creation.
    paid_amount: 0,
    due_date: '',
};

type LineItem = {
    product: string;
    product_name: string;
    packaging_type: 'SINGLE' | 'CARTON';
    items_per_carton: number;
    quantity: number;
    unit_price: number;
};

const CustomSupplierInput = ({ value, onChange, suppliers, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            if (String(value).startsWith('__custom__:')) {
                setSearch(String(value).replace('__custom__:', ''));
            } else {
                const s = suppliers.find((x: any) => String(x.id) === String(value));
                setSearch(s ? s.name : '');
            }
        } else {
            setSearch('');
        }
    }, [value, suppliers]);

    const filtered = suppliers.filter((s: any) => (s.name || '').toLowerCase().includes(search.toLowerCase()));

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
            <div className="relative flex items-center">
                <input
                    className={inputCls + " font-bold text-slate-800 bg-white pr-8"}
                    value={search}
                    onChange={e => {
                        const val = e.target.value;
                        setSearch(val);
                        onChange(val ? `__custom__:${val}` : '');
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Type custom or select supplier..."
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {open && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {filtered.map((s: any) => (
                            <div
                                key={s.id}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-[12px] text-slate-700 font-medium transition-colors"
                                onClick={() => {
                                    onChange(s.id);
                                    setSearch(s.name);
                                    setOpen(false);
                                }}
                            >
                                {s.name}
                            </div>
                        ))}
                        {search.trim() && (
                            <div
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-[12px] text-indigo-650 font-bold border-t border-slate-100 bg-indigo-50/10 flex items-center gap-1.5 transition-colors"
                                onClick={() => {
                                    onChange(`__custom__:${search.trim()}`);
                                    setOpen(false);
                                }}
                            >
                                <Plus size={14} /> Use Custom Supplier: "{search.trim()}"
                            </div>
                        )}
                        {filtered.length === 0 && !search.trim() && (
                            <div className="px-4 py-6 text-center text-slate-400 text-[11px]">
                                No suppliers found. Type to use custom supplier.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
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

    const selected = String(selectedId).startsWith('__custom__:')
        ? { id: selectedId, name: selectedId.replace('__custom__:', ''), isCustom: true }
        : products.find((p: any) => String(p.id) === String(selectedId));

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
                        <div className="w-8 h-8 rounded border border-slate-100 overflow-hidden shrink-0 bg-white flex items-center justify-center">
                            {selected.isCustom ? (
                                <Plus size={14} className="text-indigo-650" />
                            ) : selected.image ? (
                                <img src={getImageUrl(selected.image) || ''} className="w-full h-full object-contain p-0.5" alt="" />
                            ) : (
                                <Package size={14} className="text-slate-300 m-auto mt-2" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-baseline gap-1 truncate leading-tight">
                                <span className="text-[11px] font-bold text-slate-900">{selected.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                {selected.isCustom ? (
                                    <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-tight shrink-0">
                                        (Custom)
                                    </span>
                                ) : (selected.weight || selected.size) && (
                                    <span className="text-[9px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                        - {selected.weight}{selected.weight && selected.size ? ' • ' : ''}{selected.size}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter shrink-0 mt-0.5">
                                {selected.isCustom ? 'Custom written product' : `SKU: ${selected.sku || 'N/A'}`}
                            </span>
                        </div>
                    </div>
                ) : <span className="text-slate-400 italic text-[12px]">Search products...</span>}
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
                                placeholder="Type to filter or write custom..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {search.trim() && filtered.length > 0 ? (
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

                                                <div className="flex-1 flex justify-between gap-4 min-w-0">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-baseline gap-1 leading-[1.2] group-hover:text-indigo-600">
                                                <span className="text-[12px] font-bold text-slate-900 group-hover:underline line-clamp-1">{p.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                                {(p.weight || p.size) && (
                                                    <span className="text-[9px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                                        - {p.weight}{p.weight && p.size ? ' • ' : ''}{p.size}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 mt-1">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">SKU: {p.sku || 'N/A'}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span className={`text-[9px] font-bold ${p.quantity < 10 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                    {p.quantity} in stock
                                                </span>
                                            </div>
                                        </div>

                                        {/* Price Section */}
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[13px] font-black text-slate-900">{formatCurrency(p.retail_price || 0)}</span>
                                            <span className="text-[8px] text-slate-400 font-medium">Retail Price</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : null}

                        {/* Always offer custom write/typing option if search is not empty */}
                        {search.trim() && (
                            <div
                                className="p-3.5 hover:bg-indigo-50 cursor-pointer border-t border-slate-100 transition-all flex items-center gap-4 group bg-indigo-50/10"
                                onClick={() => { onSelect(`__custom__:${search.trim()}`); setOpen(false); }}
                            >
                                <div className="w-12 h-12 bg-white rounded border border-indigo-200 overflow-hidden shrink-0 flex items-center justify-center text-indigo-650 group-hover:border-indigo-400 transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[12px] font-bold text-slate-900 block truncate group-hover:text-indigo-600">
                                        Use Custom: <span className="text-indigo-600">"{search.trim()}"</span>
                                    </span>
                                    <span className="text-[9px] text-slate-500">Will be saved to supplier catalog on order creation</span>
                                </div>
                            </div>
                        )}

                        {!search.trim() && (
                            <div className="p-12 text-center flex flex-col items-center gap-2">
                                <Search size={24} className="text-slate-300" />
                                <span className="text-slate-400 text-[13px]">Type to search products or use a custom name.</span>
                            </div>
                        )}

                        {search.trim() && filtered.length === 0 && (
                            <div className="p-12 text-center flex flex-col items-center gap-2">
                                <Search size={24} className="text-slate-300" />
                                <span className="text-slate-400 text-[13px]">No matching products found. Type to use custom.</span>
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
    const selected = String(selectedId).startsWith('__custom__:')
        ? { id: selectedId, name: selectedId.replace('__custom__:', ''), isCustom: true }
        : suppliers.find((s: any) => String(s.id) === String(selectedId));

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
                <span className={selected ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                    {selected ? (
                        selected.isCustom ? `${selected.name} (New Supplier)` : selected.name
                    ) : 'Select Supplier...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-[50] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-slate-100"><input className="w-full px-2.5 py-1 text-[11.5px] border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white text-slate-800" placeholder="Search or type a new supplier..." value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        <div className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[12px] text-rose-600 font-bold border-b border-slate-100" onClick={() => { onSelect(''); setOpen(false); }}>
                            No Supplier (Internal)
                        </div>
                        {filtered.map((s: any) => (
                            <div key={s.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[12px] text-slate-700 border-b border-slate-100 last:border-0" onClick={() => { onSelect(s.id); setOpen(false); }}>{s.name}</div>
                        ))}
                        {search.trim() && (
                            <div
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-[12px] text-indigo-650 font-bold border-t border-slate-100 bg-indigo-50/10 flex items-center gap-1.5"
                                onClick={() => { onSelect(`__custom__:${search.trim()}`); setOpen(false); }}
                            >
                                <Plus size={14} /> Use New Supplier: "{search.trim()}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function AddPurchasePage() {
    const router = useRouter();
    const [purchaseMode, setPurchaseMode] = useState<'supplier' | 'custom'>('supplier');
    const [showAdvanced, setShowAdvanced] = useState(false);
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

    const handleModeChange = (mode: 'supplier' | 'custom') => {
        setPurchaseMode(mode);
        setForm(prev => ({
            ...prev,
            supplier: '',
            supplier_name: '',
            purchase_number: `PO-${Date.now().toString().slice(-6)}`
        }));
        setItems([{
            product: '',
            product_name: '',
            packaging_type: 'SINGLE',
            items_per_carton: 1,
            quantity: 1,
            unit_price: 0,
        }]);
    };
    // Prefill (supplier + product) coming from the dashboard low-stock alert links.
    const [prefill, setPrefill] = useState<{ supplier: string; sku: string; product_name: string } | null>(null);
    const supplierPrefillApplied = useRef(false);
    const prefillApplied = useRef(false);

    // Edit mode: /admin/purchases/add?id=<purchaseOrderId> loads an existing PO.
    // Read on the client (this is SSR'd, so a lazy useState initializer would see no window).
    const [editId, setEditId] = useState<string | null>(null);
    const editPrefillApplied = useRef(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const urlId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;
        if (urlId) setEditId(urlId);
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
                // Auto-select the branch when there's only one (scoped admins): no
                // point making them pick. Multi-branch users choose below.
                if ((whRes || []).length === 1) {
                    setForm(prev => ({ ...prev, warehouse: prev.warehouse || String(whRes[0].id) }));
                }
            } catch (e) {
                console.error("Failed to fetch warehouses", e);
            }

            if (!urlId) {
                setForm(prev => ({ ...prev, purchase_number: `PO-${Date.now().toString().slice(-6)}` }));
            }
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const fetchSupplierProducts = async () => {
            if (purchaseMode === 'supplier' && !form.supplier) {
                setProducts([]);
                return;
            }
            try {
                const params = (purchaseMode === 'supplier' && form.supplier) ? { supplier: form.supplier } : undefined;
                const res = await productService.getAllSupplier(params);
                const raw = res as any;
                setProducts(Array.isArray(raw) ? raw : raw?.results || []);
            } catch (error) { setProducts([]); }
        };
        fetchSupplierProducts();
    }, [form.supplier, purchaseMode]);

    // Read prefill (?supplier=&sku=&product_name=) from the dashboard low-stock links.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const sp = new URLSearchParams(window.location.search);
        const supplier = sp.get('supplier') || '';
        const sku = sp.get('sku') || '';
        const product_name = sp.get('product_name') || '';
        if (supplier || sku || product_name) setPrefill({ supplier, sku, product_name });
    }, []);

    // Apply the prefilled supplier once (after suppliers load) — never override a later manual change.
    useEffect(() => {
        if (!prefill?.supplier || supplierPrefillApplied.current || suppliers.length === 0) return;
        supplierPrefillApplied.current = true;
        const matched = suppliers.find(s => String(s.id) === String(prefill.supplier));
        setForm(f => ({ ...f, supplier: prefill.supplier, supplier_name: matched?.name || f.supplier_name }));
    }, [prefill, suppliers]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply the prefilled product once that supplier's products have loaded.
    useEffect(() => {
        if (!prefill || prefillApplied.current || products.length === 0) return;
        const norm = (v: any) => String(v ?? '').trim().toLowerCase();
        const match = products.find((p: any) =>
            (prefill.sku && norm(p.sku) === norm(prefill.sku)) ||
            (prefill.product_name && norm(p.name) === norm(prefill.product_name))
        );
        if (!match) return;
        prefillApplied.current = true;
        setItems(prev => {
            const next = [...prev];
            next[0] = {
                ...next[0],
                product: String(match.id),
                product_name: match.name || '',
                unit_price: match.retail_price ? parseFloat(match.retail_price) : next[0].unit_price,
            };
            return next;
        });
    }, [products, prefill]);

    // Load an existing purchase order into the form when editing (?id=...).
    useEffect(() => {
        if (!editId || editPrefillApplied.current) return;
        editPrefillApplied.current = true;
        (async () => {
            try {
                const po = await purchaseService.getById(editId);
                setForm({
                    purchase_number: po.purchase_number || '',
                    supplier: String(po.supplier || ''),
                    supplier_name: po.supplier_name || '',
                    order_date: (po.order_date || po.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
                    status: po.status || 'PENDING',
                    payment_method: po.payment_method || 'CASH',
                    notes: po.notes || '',
                    shipping_cost: parseFloat(po.shipping_cost || 0) || 0,
                    tax_rate: 0,
                    warehouse: String(po.warehouse || ''),
                    paid_amount: parseFloat(po.paid_amount || 0) || 0,
                    due_date: (po.due_date || '') as string,
                });
                const loaded = (po.items || []).map((it: any) => ({
                    product: String(it.product || ''),
                    product_name: it.product_name || '',
                    packaging_type: (it.packaging_type || 'SINGLE') as 'SINGLE' | 'CARTON',
                    items_per_carton: it.items_per_carton || 1,
                    quantity: it.quantity || 1,
                    unit_price: parseFloat(it.price || 0) || 0,
                }));
                if (loaded.length) setItems(loaded);
            } catch {
                toast.error('Failed to load purchase order for editing');
                router.push('/admin/purchases');
            }
        })();
    }, [editId, router]);

    const handleSave = async (warehouseIdOrEvent?: any) => {
        const warehouseId = typeof warehouseIdOrEvent === 'string' ? warehouseIdOrEvent : undefined;
        if (purchaseMode === 'supplier' && !form.supplier) {
            return toast.error('Please select a supplier');
        }
        if (items.some(i => !i.product)) return toast.error('Please select a product for all items');

        setSaving(true);
        let finalSupplier = form.supplier;
        let finalSupplierName = form.supplier_name;

        // 1. If supplier is custom written, register them on the fly
        if (form.supplier.startsWith('__custom__:')) {
            try {
                const newSuppName = form.supplier.replace('__custom__:', '');
                const rand = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString();
                const newSupp = await supplierService.create({
                    name: newSuppName,
                    company: newSuppName,
                    username: `supp_${rand}`,
                    email: `supplier_${rand}@alqavi.com`,
                    password: `pass_${rand}`,
                    is_active: true
                });
                finalSupplier = String(newSupp.id);
                finalSupplierName = newSupp.name;
                setForm(f => ({ ...f, supplier: String(newSupp.id), supplier_name: newSupp.name }));
            } catch (err: any) {
                setSaving(false);
                return toast.error('Failed to create new supplier');
            }
        }

        // 2. Register custom products if any exist
        let finalItems = [...items];
        const hasCustom = items.some(i => i.product.startsWith('__custom__:'));
        if (hasCustom) {
            try {
                const targetSupplier = finalSupplier || (suppliers.length > 0 ? String(suppliers[0].id) : '');
                if (!targetSupplier) {
                    setSaving(false);
                    return toast.error('Please create or select a supplier to register custom products.');
                }
                finalItems = await Promise.all(items.map(async (item) => {
                    if (item.product.startsWith('__custom__:')) {
                        const name = item.product.replace('__custom__:', '');
                        const newProd = await productService.createSupplier({
                            name,
                            supplier: targetSupplier,
                            sku: `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                            retail_price: String(item.unit_price || 0),
                            price: String(item.unit_price || 0),
                            status: 'ACTIVE'
                        });
                        return {
                            ...item,
                            product: String(newProd.id),
                            product_name: newProd.name
                        };
                    }
                    return item;
                }));
                setItems(finalItems);
            } catch (err: any) {
                setSaving(false);
                return toast.error('Failed to register custom supplier products');
            }
        }

        // Tax is entered as a rate (%); the backend stores an absolute tax_amount and
        // folds shipping + tax into the grand total, so compute it here.
        const taxAmount = (totalAmount * ((form as any).tax_rate || 0)) / 100;

        // Edit mode: update the existing order (full header + items recompute).
        if (editId) {
            try {
                await purchaseService.updateFull(editId, { ...form, supplier: finalSupplier, supplier_name: finalSupplierName, items: finalItems, tax_amount: taxAmount });
                toast.success('Purchase order updated!');
                router.push('/admin/purchases');
            } catch (err: any) {
                const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update purchase';
                toast.error(msg);
            } finally {
                setSaving(false);
            }
            return;
        }

        if (form.status === 'RECEIVED' && !warehouseId && !form.warehouse) {
            setTempPayload({ ...form, supplier: finalSupplier, supplier_name: finalSupplierName, items: finalItems });
            setIsWarehouseModalOpen(true);
            setSaving(false);
            return;
        }

        const finalWarehouseId = warehouseId || form.warehouse;

        // A purchase order increases inventory, so we deliberately do NOT cap the
        // quantity at current stock — you must be able to restock a sold-out item.

        try {
            // Derive the settlement status from any advance paid at creation.
            const grandTotal = totalAmount + ((form as any).shipping_cost || 0) + taxAmount;
            const paidNow = Number((form as any).paid_amount) || 0;
            const payment_status = paidNow <= 0 ? 'UNPAID' : paidNow >= grandTotal ? 'PAID' : 'PARTIAL';
            const payload: any = { ...form, supplier: finalSupplier, supplier_name: finalSupplierName, items: finalItems, tax_amount: taxAmount, payment_status };
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
                if (String(val).startsWith('__custom__:')) {
                    const name = String(val).replace('__custom__:', '');
                    return { ...item, product: val, product_name: name, unit_price: item.unit_price || 0 };
                }
                const p = products.find(p => String(p.id) === String(val));
                if (p && p.supplier) {
                    const matched = suppliers.find(s => String(s.id) === String(p.supplier));
                    setForm(f => ({ ...f, supplier: String(p.supplier), supplier_name: matched?.name || f.supplier_name }));
                }
                return { ...item, product: val, product_name: p?.name || '', unit_price: p?.retail_price ? parseFloat(p.retail_price) : item.unit_price };
            }
            return { ...item, [field]: val };
        }));
    };

    const calculateSubtotal = (item: LineItem) => {
        const units = item.packaging_type === 'CARTON'
            ? (item.quantity || 0) * (item.items_per_carton || 0)
            : (item.quantity || 0);
        return units * (item.unit_price || 0);
    };
    const totalAmount = items.reduce((sum, item) => sum + calculateSubtotal(item), 0);

    // Live order totals + settlement, so the summary bar mirrors what the backend will store.
    const taxAmountLive = (totalAmount * ((form as any).tax_rate || 0)) / 100;
    const grandTotal = totalAmount + ((form as any).shipping_cost || 0) + taxAmountLive;
    const paidNow = Number((form as any).paid_amount) || 0;
    const balanceDue = Math.max(0, grandTotal - paidNow);
    const paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' =
        grandTotal > 0 && paidNow >= grandTotal ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'UNPAID';
    const paymentPill = {
        PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
        UNPAID: 'bg-slate-100 text-slate-500 border-slate-200',
    }[paymentStatus];

    const renderItemsList = () => {
        return items.map((item, i) => {
            // A purchase order *adds* stock, so there is no upper cap on the order
            // quantity — current stock is shown as context only, never a limit.
            const p = products.find(prod => String(prod.id) === String(item.product));

            return (
                <div key={i} className="bg-white border border-slate-200/70 rounded-xl p-4 transition-all hover:border-indigo-400 hover:shadow-md group">
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        {/* Product Selector */}
                        <div className="flex-1 min-w-[200px] max-w-[450px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</label>
                            {purchaseMode === 'custom' ? (
                                <input
                                    className={inputCls + " font-bold text-slate-800 bg-white"}
                                    value={item.product_name || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        updateItem(i, 'product', `__custom__:${val}`);
                                    }}
                                    placeholder="Type custom product name..."
                                />
                            ) : (
                                <ProductSelector selectedId={item.product} products={products} inputCls={selectCls} onSelect={(val: any) => updateItem(i, 'product', val)} />
                            )}
                        </div>

                        {/* Type */}
                        <div className="w-full sm:w-[140px] shrink-0">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:text-center">Type</label>
                            <select className={selectCls} value={item.packaging_type} onChange={e => updateItem(i, 'packaging_type', e.target.value)}>
                                <option value="SINGLE">Single</option>
                                <option value="CARTON">Carton</option>
                            </select>
                        </div>

                        {/* Qty */}
                        <div className="w-full sm:w-[105px] shrink-0 relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:text-center">{item.packaging_type === 'CARTON' ? 'Cartons' : 'Qty'}</label>
                            <input
                                className={inputCls + " text-center font-bold tabular-nums text-indigo-650"}
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => updateItem(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                            />
                        </div>

                        {/* Pcs/Ctn */}
                        <div className="w-full sm:w-[105px] shrink-0">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:text-center">Pcs/Ctn</label>
                            <input className={inputCls + (item.packaging_type !== 'CARTON' ? ' opacity-50 bg-slate-50' : '') + " text-center tabular-nums"} type="number" min="1" disabled={item.packaging_type !== 'CARTON'} value={item.items_per_carton || ''} onChange={e => updateItem(i, 'items_per_carton', parseInt(e.target.value) || 0)} />
                        </div>

                        {/* Price / Cost */}
                        <div className="w-full sm:w-[160px] shrink-0">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:text-center">Price / Cost</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">Rs</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={inputCls + " pl-7 font-bold text-slate-800 text-center"}
                                    value={item.unit_price || ''}
                                    onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Action */}
                        <div className="w-auto sm:w-[36px] shrink-0 flex justify-center pb-2">
                            <button onClick={() => removeItem(i)} className="text-slate-350 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50/50">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    {item.product && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
                            <div className="flex items-center gap-3">
                                <span>Total Pcs: <b className="text-slate-700 tabular-nums">{item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity} Pcs</b></span>
                                {p && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span>Current stock: <b className="text-slate-700 tabular-nums">{p.quantity}</b></span>
                                    </>
                                )}
                            </div>
                            <div className="text-[13px] font-bold text-slate-900 tabular-nums">
                                Subtotal: {formatCurrency(calculateSubtotal(item))}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    /* ─── Order Items card (identical in both modes) ─── */
    const renderItemsCard = () => (
        <Card className="relative z-[10]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Order Items</h2>
                    <p className="text-[12px] text-slate-500">Select products and quantities.</p>
                </div>
                <Btn variant="secondary" className="text-[12px] py-1.5 px-3.5 h-8.5" onClick={addItem}><Plus size={14} /> Add Item</Btn>
            </div>
            <div className="p-6 space-y-4">
                {renderItemsList()}
            </div>
        </Card>
    );

    /* ─── Order Information card — shared shell; only the Supplier field differs per mode ─── */
    const renderOrderInfoCard = (supplierField: React.ReactNode) => (
        <Card>
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Order Information</h2>
                <p className="text-[12px] text-slate-500">Enter order number, supplier, and date.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Order Number" required>
                    <input className={inputCls} value={form.purchase_number} onChange={e => setForm(f => ({ ...f, purchase_number: e.target.value }))} placeholder="e.g. PO-123456" />
                </Field>
                <Field label="Supplier" required={purchaseMode === 'supplier'}>
                    {supplierField}
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
                <Field label="Paid Now (Advance)">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                        <input
                            className={inputCls + " pl-9"}
                            type="number"
                            min="0"
                            value={(form as any).paid_amount || ''}
                            onChange={e => setForm(f => ({ ...f, paid_amount: Math.max(0, parseFloat(e.target.value) || 0) }))}
                            placeholder="0.00"
                        />
                    </div>
                </Field>
                {warehouses.length > 1 && (
                    <Field label="Branch / Warehouse" required>
                        <select className={selectCls} value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}>
                            <option value="">Select branch</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}{w.area_name ? ` · ${w.area_name}` : ''}</option>
                            ))}
                        </select>
                    </Field>
                )}

                <div className="col-span-1 md:col-span-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-[12px] font-bold text-indigo-650 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Shipping, Tax, Balance Date)'}
                    </button>
                </div>

                {showAdvanced && (
                    <>
                        <Field label="Shipping Cost">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                                <input
                                    className={inputCls + " pl-9"}
                                    type="number"
                                    min="0"
                                    value={(form as any).shipping_cost || ''}
                                    onChange={e => setForm(f => ({ ...f, shipping_cost: Math.max(0, parseFloat(e.target.value) || 0) }))}
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
                                    min="0"
                                    value={(form as any).tax_rate || ''}
                                    onChange={e => setForm(f => ({ ...f, tax_rate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                    placeholder="0"
                                />
                            </div>
                        </Field>
                        <Field label="Balance Due Date">
                            <input
                                className={inputCls}
                                type="date"
                                value={(form as any).due_date || ''}
                                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                            />
                        </Field>
                    </>
                )}
            </div>
        </Card>
    );

    const supplierField = purchaseMode === 'supplier' ? (
        <SupplierSelector selectedId={form.supplier} suppliers={suppliers} inputCls={selectCls} onSelect={(val: any) => {
            const matched = suppliers.find(c => String(c.id) === String(val));
            setForm(f => ({ ...f, supplier: val, supplier_name: matched?.name || '' }));
        }} />
    ) : (
        <CustomSupplierInput
            value={form.supplier}
            suppliers={suppliers}
            inputCls={selectCls}
            onChange={(val: any) => {
                if (String(val).startsWith('__custom__:')) {
                    const name = String(val).replace('__custom__:', '');
                    setForm(f => ({ ...f, supplier: val, supplier_name: name }));
                } else {
                    const matched = suppliers.find(c => String(c.id) === String(val));
                    setForm(f => ({ ...f, supplier: val, supplier_name: matched?.name || '' }));
                }
            }}
        />
    );

    return (
        <div className="pb-20">
            <div className="max-w-[1100px] mx-auto">
                <PageHeader
                    title={editId ? `Edit Purchase ${form.purchase_number || ''}`.trim() : 'New Purchase'}
                    subtitle={editId ? 'Update this purchase order — supplier, items, and totals.' : 'Create a purchase order with supplier, items, and totals.'}
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Purchases', href: '/admin/purchases' }, { label: editId ? 'Edit Purchase' : 'New Purchase' }]}
                    actions={
                        <div className="bg-slate-100 p-1.5 rounded-xl inline-flex gap-2 border border-slate-250/60 shadow-sm">
                            <button
                                type="button"
                                onClick={() => handleModeChange('supplier')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-black tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${purchaseMode === 'supplier' ? 'bg-white text-indigo-650 shadow-md border border-slate-200 font-bold scale-[1.01]' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Building2 size={13} /> Select from Supplier
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeChange('custom')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-black tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${purchaseMode === 'custom' ? 'bg-white text-indigo-650 shadow-md border border-slate-200 font-bold scale-[1.01]' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <PackagePlus size={13} /> Custom Purchase
                            </button>
                        </div>
                    }
                />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-slate-500">Loading data...</div>
                ) : (
                    <div className="space-y-5">

                            {purchaseMode === 'supplier' ? (
                                <>
                                    {renderOrderInfoCard(supplierField)}
                                    {renderItemsCard()}
                                </>
                            ) : (
                                <>
                                    {renderItemsCard()}
                                    {renderOrderInfoCard(supplierField)}
                                </>
                            )}
                                         <Card>
                                <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-[12px] font-extrabold text-slate-900 tracking-tight">Notes (Optional)</h2></div>
                                <div className="p-4"><textarea className="w-full p-3 border border-slate-200 rounded-lg text-[12px] text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" rows={3} placeholder="Any notes for this purchase..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            </Card>

                            <Card className="p-4 sm:p-5 bg-slate-50 border border-slate-200">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
                                    <div className="flex flex-wrap gap-8 text-[12.5px]">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Items Total</span>
                                            <span className="font-extrabold text-slate-800 text-[14px] mt-0.5 tabular-nums">{formatCurrency(totalAmount)}</span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-200 pl-8">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Shipping</span>
                                            <span className={`text-[14px] mt-0.5 font-extrabold tabular-nums ${((form as any).shipping_cost > 0) ? "text-slate-850" : "text-emerald-700 font-black"}`}>
                                                {(form as any).shipping_cost > 0 ? formatCurrency((form as any).shipping_cost) : 'FREE'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-200 pl-8">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tax ({(form as any).tax_rate || 0}%)</span>
                                            <span className="font-extrabold text-slate-800 text-[14px] mt-0.5 tabular-nums">{formatCurrency(taxAmountLive)}</span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-200 pl-8">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Grand Total</span>
                                            <span className="text-[18px] font-black text-indigo-650 mt-0.5 tabular-nums">
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </div>
                                        {paidNow > 0 && (
                                            <>
                                                <div className="flex flex-col border-l border-slate-200 pl-8">
                                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Paid Now</span>
                                                    <span className="font-extrabold text-emerald-700 text-[14px] mt-0.5 tabular-nums">{formatCurrency(paidNow)}</span>
                                                </div>
                                                <div className="flex flex-col border-l border-slate-200 pl-8">
                                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Balance Due</span>
                                                    <span className={`font-black text-[14px] mt-0.5 tabular-nums ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(balanceDue)}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex flex-col justify-center border-l border-slate-200 pl-8">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${paymentPill}`}>
                                                {paymentStatus}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 w-full md:w-auto">
                                        <Btn className="w-full md:w-[220px] justify-center text-[12px] py-3 uppercase tracking-wider font-extrabold" loading={saving} onClick={() => handleSave()} disabled={items.some(i => !i.product)}>
                                            {editId ? 'Update Order' : 'Place Order'}
                                        </Btn>
                                    </div>
                                </div>
                            </Card>
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
