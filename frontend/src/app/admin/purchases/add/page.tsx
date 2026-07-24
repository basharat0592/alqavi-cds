'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle, Package, ArrowLeft, RefreshCw, Search, ChevronDown, Building2, PackagePlus, History } from 'lucide-react';
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
    // Purchases are received immediately — this triggers the backend stock sync
    // (same product name → adds to stock, new → creates a stock entry).
    status: 'RECEIVED', payment_method: 'CASH', notes: '',
    shipping_cost: 0,
    tax_rate: 0,
    warehouse: '',
    // Optional initial settlement at creation.
    paid_amount: 0,
    due_date: '',
    // Supplier's own bill/invoice number (desktop "Bill.No").
    reference_number: '',
    // Flat discount on the whole bill (desktop "Extra Disc").
    extra_discount: 0,
    // Staff member who booked the purchase (desktop "Staff").
    staff: '',
};

const EMPTY_ITEM: LineItem = {
    company: '',
    product: '',
    product_name: '',
    barcode: '',
    packaging_type: 'SINGLE',
    items_per_carton: 1,
    quantity: 1,
    unit_price: 0,
    bonus_quantity: 0,
    selling_price: 0,
    retail_rate: 0,
    expiry_date: '',
    apply_expiry: true,
};

type LineItem = {
    company: string;           // selected company (filters the product list)
    product: string;
    product_name: string;
    barcode: string;           // product bar code (auto-generated / from catalog)
    packaging_type: 'SINGLE' | 'CARTON';
    items_per_carton: number;
    quantity: number;
    unit_price: number;        // Pur.Rate (cost)
    bonus_quantity: number;    // Bonus (U) — free units
    selling_price: number;     // Sale Rate
    retail_rate: number;       // Retail.Rate
    expiry_date: string;       // Exp Date (YYYY-MM-DD)
    apply_expiry: boolean;     // whether the Exp Date field is enabled for this line
};

/* ─── Product Selector — single searchable input (type to filter or write custom) ─── */
const ProductSelector = ({ selectedId, onSelect, products, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = String(selectedId).startsWith('__custom__:')
        ? { id: selectedId, name: String(selectedId).replace('__custom__:', ''), isCustom: true }
        : products.find((p: any) => String(p.id) === String(selectedId));

    const q = search.trim().toLowerCase();
    const filtered = q
        ? products.filter((p: any) => (p.name || '').toLowerCase().includes(q) || (p.sku && String(p.sku).toLowerCase().includes(q)))
        : products;

    useEffect(() => {
        const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input
                    className={inputCls + ' pr-8'}
                    value={open ? search : (selected ? selected.name : '')}
                    placeholder="Search or type product…"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                />
                <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180 text-indigo-600' : ''}`} />
            </div>

            {open && (
                <div className="absolute z-[100] top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.18)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                        {filtered.slice(0, 60).map((p: any) => (
                            <div
                                key={p.id}
                                className="px-3 py-2 hover:bg-indigo-50/60 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between gap-3"
                                onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}
                            >
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-semibold text-slate-800 truncate">{(p.name || '').replace(/\s*\(.*?\)\s*$/, '')}</p>
                                    <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide">SKU: {p.sku || 'N/A'} · {p.quantity ?? 0} in stock</p>
                                </div>
                                <span className="text-[12px] font-black text-slate-700 shrink-0 tabular-nums">{formatCurrency(p.retail_price || 0)}</span>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="px-3 py-6 text-center text-slate-400 text-[12px]">
                                No products{q ? ' match' : ' for this company'}. Add one via “Add Products”.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Supplier Selector (registered suppliers only — no free-text/new supplier) ─── */
const SupplierSelector = ({ selectedId, onSelect, suppliers, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = suppliers.filter((s: any) => (s.name || '').toLowerCase().includes(search.toLowerCase()));
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
                <span className={selected ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                    {selected ? selected.name : 'Select a registered supplier...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-[50] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-slate-100"><input className="w-full px-2.5 py-1 text-[11.5px] border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white text-slate-800" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {filtered.map((s: any) => (
                            <div key={s.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[12px] text-slate-700 border-b border-slate-100 last:border-0" onClick={() => { onSelect(s.id); setOpen(false); }}>{s.name}</div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-6 text-center text-slate-400 text-[11px]">
                                No registered suppliers{search.trim() ? ' match your search' : ''}. Add one in the Supplier Registry first.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Company Selector (searchable — pick a company / brand) ─── */
const CompanySelector = ({ selectedId, onSelect, companies, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = companies.find((c: any) => String(c.id) === String(selectedId));
    const q = search.trim().toLowerCase();
    const filtered = q ? companies.filter((c: any) => (c.name || '').toLowerCase().includes(q)) : companies;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) { setOpen(false); setSearch(''); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input
                    className={inputCls + ' pr-8'}
                    value={open ? search : (selected ? selected.name : '')}
                    placeholder="Search company…"
                    onFocus={() => setOpen(true)}
                    onChange={e => { setSearch(e.target.value); setOpen(true); }}
                />
                <ChevronDown size={14} className="text-slate-400 shrink-0 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {open && (
                <div className="absolute z-[100] top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.map((c: any) => (
                            <div key={c.id} className="px-4 py-2 hover:bg-indigo-50/60 cursor-pointer text-[12px] text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between gap-2" onClick={() => { onSelect(String(c.id)); setOpen(false); setSearch(''); }}>
                                <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                                {c.category && <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">{c.category}</span>}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-6 text-center text-slate-400 text-[11px]">
                                No companies{q ? ' match your search' : ''}. Add one via “Add Products → Find Company”.
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
    const [purchaseMode, setPurchaseMode] = useState<'supplier' | 'custom'>('custom');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    // Products that exist in Current Stocks (keyed by product id + name) — the line-item
    // Product dropdown lists ONLY these. Brand-new products are added via the popup.
    const [stockKeys, setStockKeys] = useState<{ ids: Set<string>; names: Set<string> }>({ ids: new Set(), names: new Set() });
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [staffList, setStaffList] = useState<any[]>([]);
    const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [tempPayload, setTempPayload] = useState<any>(null);

    // Previous purchase history for the products currently on this order.
    const [histLoaded, setHistLoaded] = useState(false);
    const [histLoading, setHistLoading] = useState(false);
    const [histRows, setHistRows] = useState<any[]>([]);

    // ── "Add Products" popup (Product Detail) + inline "Find Company" popup ──
    const [companies, setCompanies] = useState<any[]>([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [pForm, setPForm] = useState({ name: '', company: '', barcode: '', packing: '', reorder: '', category: '', status: 'ACTIVE', apply_expiry: 'yes' });
    const [cForm, setCForm] = useState({ name: '', category: '' });
    const [savingCompany, setSavingCompany] = useState(false);
    const [savingProduct, setSavingProduct] = useState(false);

    useEffect(() => {
        (companyService as any).getCompanies?.().then((r: any) => setCompanies(Array.isArray(r) ? r : r?.results || [])).catch(() => { });
    }, []);

    // Load Current Stocks so the Product dropdown can show only in-stock products.
    useEffect(() => {
        (inventoryService as any).getInventory?.()
            .then((rows: any) => {
                const list = Array.isArray(rows) ? rows : (rows?.results || []);
                const ids = new Set<string>();
                const names = new Set<string>();
                for (const s of list) {
                    if (s.product) ids.add(String(s.product));
                    if (s.product_name) names.add(String(s.product_name).trim().toLowerCase());
                }
                setStockKeys({ ids, names });
            })
            .catch(() => { });
    }, []);

    // Fresh, short, unique barcode for every product (e.g. "K4Z9F7" — 6 chars).
    const genBarcode = () =>
        (Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 100).toString().padStart(2, '0')).toUpperCase();

    const openAddProduct = () => {
        setPForm({ name: '', company: '', barcode: genBarcode(), packing: '', reorder: '', category: '', status: 'ACTIVE', apply_expiry: 'yes' });
        setShowProductModal(true);
    };
    const confirmAddProduct = async () => {
        if (!pForm.name.trim()) return toast.error('Enter a product name.');
        // Supplier is optional now — use the order's supplier or the first registered
        // one if any; otherwise create the product without a supplier (company-based).
        const targetSupplier = form.supplier || (suppliers[0]?.id ? String(suppliers[0].id) : '');
        setSavingProduct(true);
        try {
            // Create a real supplier product tagged with its company, so it shows up
            // in the Company → Product dropdowns going forward.
            const created = await productService.createSupplier({
                name: pForm.name.trim(),
                supplier: targetSupplier,
                company: pForm.company || '',
                sku: pForm.barcode || `SKU-${Date.now().toString().slice(-6)}`,
                barcode: pForm.barcode || '',
                status: pForm.status,
                price: '0',
                retail_price: '0',
            });
            // Refresh the product list so the new one is selectable.
            try {
                const res = await productService.getAllSupplier();
                const raw = res as any;
                setProducts(Array.isArray(raw) ? raw : raw?.results || []);
            } catch { /* non-blocking */ }
            const packing = parseInt(pForm.packing) || 1;
            const line: LineItem = {
                ...EMPTY_ITEM,
                company: pForm.company || '',
                product: String(created.id),
                product_name: created.name,
                barcode: pForm.barcode || (created as any).barcode || (created as any).sku || '',
                packaging_type: packing > 1 ? 'CARTON' : 'SINGLE',
                items_per_carton: packing,
                // Re-Order Qty from the popup prefills the line quantity.
                quantity: parseInt(pForm.reorder) || 1,
                // "Apply Expiry Date = Yes" enables the Exp Date field on this line.
                apply_expiry: pForm.apply_expiry === 'yes',
            };
            setItems(prev => {
                const idx = prev.findIndex(i => !i.product);
                if (idx >= 0) { const copy = [...prev]; copy[idx] = line; return copy; }
                return [...prev, line];
            });
            // Adopt the fallback supplier onto the order so the PO has one (if any exist).
            if (!form.supplier && targetSupplier) {
                const matched = suppliers.find((s: any) => String(s.id) === String(targetSupplier));
                setForm(f => ({ ...f, supplier: targetSupplier, supplier_name: matched?.name || f.supplier_name }));
            }
            setShowProductModal(false);
            toast.success('Product created and added to the purchase.');
        } catch (e: any) {
            toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Failed to create product');
        } finally { setSavingProduct(false); }
    };
    const saveCompanyInline = async () => {
        if (!cForm.name.trim()) return toast.error('Enter a company name.');
        setSavingCompany(true);
        try {
            const created = await (companyService as any).createCompany({ name: cForm.name.trim(), category: cForm.category.trim() });
            const list = await (companyService as any).getCompanies();
            setCompanies(Array.isArray(list) ? list : (list?.results || []));
            // Newly-added company also auto-fills its category into the product form.
            if (created?.id) setPForm(f => ({ ...f, company: String(created.id), category: cForm.category.trim() || f.category }));
            setCForm({ name: '', category: '' });
            setShowCompanyModal(false);
            toast.success('Company added to the list.');
        } catch (e: any) {
            toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Failed to add company');
        } finally { setSavingCompany(false); }
    };

    const handleModeChange = (mode: 'supplier' | 'custom') => {
        setPurchaseMode(mode);
        setForm(prev => ({
            ...prev,
            supplier: '',
            supplier_name: '',
            purchase_number: `PO-${Date.now().toString().slice(-6)}`
        }));
        setItems([{ ...EMPTY_ITEM }]);
    };
    // Prefill (supplier + product) coming from low-stock links / Current Stock "Reorder".
    const [prefill, setPrefill] = useState<{ supplier: string; sku: string; product_name: string; price: string } | null>(null);
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

            // Staff dropdown: internal team members (exclude supplier/customer/delivery portal roles).
            const staff = usersArr
                .filter((u: any) => {
                    const r = (u.role_name || '').toLowerCase();
                    return !r.includes('supplier') && !r.includes('customer') && !r.includes('delivery');
                })
                .map((u: any) => ({
                    id: u.id,
                    name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
                }));
            setStaffList(staff);

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
        const price = sp.get('price') || '';
        if (supplier || sku || product_name) {
            setPrefill({ supplier, sku, product_name, price });
        }
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
                // Prefer the exact cost passed from Reorder so the received stock
                // merges into the same batch; otherwise fall back to the catalog price.
                unit_price: prefill.price ? parseFloat(prefill.price)
                    : match.retail_price ? parseFloat(match.retail_price) : next[0].unit_price,
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
                    reference_number: po.reference_number || '',
                    extra_discount: parseFloat(po.extra_discount || 0) || 0,
                    staff: String(po.staff || ''),
                });
                const loaded: LineItem[] = (po.items || []).map((it: any) => ({
                    company: String(it.company || ''),
                    product: String(it.product || ''),
                    product_name: it.product_name || '',
                    barcode: it.barcode || it.sku || '',
                    packaging_type: (it.packaging_type || 'SINGLE') as 'SINGLE' | 'CARTON',
                    items_per_carton: it.items_per_carton || 1,
                    quantity: it.quantity || 1,
                    unit_price: parseFloat(it.price || 0) || 0,
                    bonus_quantity: parseInt(it.bonus_quantity || 0) || 0,
                    selling_price: parseFloat(it.selling_price || 0) || 0,
                    retail_rate: parseFloat(it.retail_rate || 0) || 0,
                    expiry_date: (it.expiry_date || '') as string,
                    apply_expiry: true,
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
        if (items.some(i => !i.product)) return toast.error('Please select a product for all items');

        setSaving(true);
        // Supplier is optional — use the chosen one, else the first registered supplier
        // if any, else none (the purchase order's supplier is nullable).
        const validSupplier = form.supplier && !String(form.supplier).startsWith('__custom__:') ? form.supplier : '';
        const finalSupplier = validSupplier || (suppliers[0]?.id ? String(suppliers[0].id) : '');
        const finalSupplierName = form.supplier_name;

        // 2. Register custom products if any exist
        let finalItems = [...items];
        const hasCustom = items.some(i => i.product.startsWith('__custom__:'));
        if (hasCustom) {
            try {
                const targetSupplier = finalSupplier || (suppliers.length > 0 ? String(suppliers[0].id) : '');
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
                await purchaseService.updateFull(editId, { ...form, supplier: finalSupplier || null, supplier_name: finalSupplierName, items: finalItems, tax_amount: taxAmount });
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

        // Only prompt for a branch when the admin genuinely has multiple; otherwise
        // the received stock lands in their single/assigned branch automatically.
        if (form.status === 'RECEIVED' && !warehouseId && !form.warehouse && warehouses.length > 1) {
            setTempPayload({ ...form, supplier: finalSupplier || null, supplier_name: finalSupplierName, items: finalItems });
            setIsWarehouseModalOpen(true);
            setSaving(false);
            return;
        }

        const finalWarehouseId = warehouseId || form.warehouse;

        // A purchase order increases inventory, so we deliberately do NOT cap the
        // quantity at current stock — you must be able to restock a sold-out item.

        try {
            // Derive the settlement status from any advance paid at creation.
            const grandTotal = Math.max(0, totalAmount + ((form as any).shipping_cost || 0) + taxAmount - (Number((form as any).extra_discount) || 0));
            const paidNow = Number((form as any).paid_amount) || 0;
            const payment_status = paidNow <= 0 ? 'UNPAID' : paidNow >= grandTotal ? 'PAID' : 'PARTIAL';
            const payload: any = { ...form, supplier: finalSupplier || null, supplier_name: finalSupplierName, items: finalItems, tax_amount: taxAmount, payment_status };
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

    // Load past purchase-order lines for the products currently on this order.
    const loadPrevHistory = async () => {
        const productIds = new Set(
            items.filter(i => i.product && !String(i.product).startsWith('__custom__:')).map(i => String(i.product))
        );
        if (productIds.size === 0) { toast.error('Add a product first to see its history.'); return; }
        setHistLoading(true);
        try {
            const res: any = await purchaseService.getAll({ page_size: 200 });
            const orders = Array.isArray(res) ? res : (res?.results || []);
            const rows: any[] = [];
            for (const po of orders) {
                for (const it of (po.items || [])) {
                    if (productIds.has(String(it.product))) {
                        rows.push({
                            date: (po.order_date || po.created_at || '').slice(0, 10),
                            po: po.purchase_number || po.order_number || '—',
                            supplier: po.supplier_name || '—',
                            product: it.product_name || '—',
                            qty: it.quantity ?? 0,
                            rate: parseFloat(it.price || 0) || 0,
                            subtotal: parseFloat(it.subtotal || 0) || 0,
                        });
                    }
                }
            }
            rows.sort((a, b) => (a.date < b.date ? 1 : -1));
            setHistRows(rows);
            setHistLoaded(true);
        } catch {
            toast.error('Failed to load previous history.');
        } finally { setHistLoading(false); }
    };

    const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);

    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            // Changing the company resets the chosen product (it may belong to another company).
            if (field === 'company') {
                return { ...item, company: val, product: '', product_name: '' };
            }
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
                return {
                    ...item,
                    product: val,
                    product_name: p?.name || '',
                    // Adopt the product's own company + bar code so the row stays in sync.
                    company: p?.company ? String(p.company) : item.company,
                    barcode: p?.barcode || p?.sku || item.barcode || '',
                    unit_price: p?.retail_price ? parseFloat(p.retail_price) : item.unit_price,
                };
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

    // Value of free bonus units (cost basis) — shown as "Amt Bonus" like the desktop app.
    const bonusValue = items.reduce((sum, item) => sum + ((item.bonus_quantity || 0) * (item.unit_price || 0)), 0);

    // Live order totals + settlement, so the summary bar mirrors what the backend will store.
    const taxAmountLive = (totalAmount * ((form as any).tax_rate || 0)) / 100;
    const extraDiscount = Number((form as any).extra_discount) || 0;
    const grandTotal = Math.max(0, totalAmount + ((form as any).shipping_cost || 0) + taxAmountLive - extraDiscount);
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
                <div key={i} className={"relative" + (i > 0 ? " border-t border-slate-100 pt-6 mt-6" : "")}>
                    {/* Row 1 — company / product / bar code + remove */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px] gap-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 mb-1">Company</label>
                                <CompanySelector selectedId={item.company} companies={companies} inputCls={selectCls} onSelect={(val: any) => updateItem(i, 'company', val)} />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 mb-1">Product</label>
                                <ProductSelector
                                    selectedId={item.product}
                                    products={products.filter((p: any) => {
                                        const companyOk = !item.company || String(p.company ?? '') === String(item.company);
                                        // Only products that are in Current Stocks (by id or name).
                                        const inStock = stockKeys.ids.has(String(p.id)) || stockKeys.names.has((p.name || '').trim().toLowerCase());
                                        return companyOk && inStock;
                                    })}
                                    inputCls={selectCls}
                                    onSelect={(val: any) => updateItem(i, 'product', val)}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 mb-1">Bar Code</label>
                                <input
                                    className={selectCls + ' tabular-nums bg-slate-50 text-center font-bold text-slate-700'}
                                    value={item.barcode || ''}
                                    onChange={e => updateItem(i, 'barcode', e.target.value)}
                                    placeholder="—"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => removeItem(i)}
                            title="Remove item"
                            className="shrink-0 mb-0.5 w-9 h-9 flex items-center justify-center rounded-lg text-slate-350 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>

                    {/* Row 2 — quantities & pricing grid */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                        {/* Type */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Type</label>
                            <select className={selectCls} value={item.packaging_type} onChange={e => updateItem(i, 'packaging_type', e.target.value)}>
                                <option value="SINGLE">Single</option>
                                <option value="CARTON">Carton</option>
                            </select>
                        </div>

                        {/* Qty */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">{item.packaging_type === 'CARTON' ? 'Cartons' : 'Qty'}</label>
                            <input
                                className={inputCls + " text-center font-bold tabular-nums text-indigo-650"}
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => updateItem(i, 'quantity', e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                            />
                        </div>

                        {/* Packing */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Packing</label>
                            <input className={inputCls + (item.packaging_type !== 'CARTON' ? ' opacity-50 bg-slate-50' : '') + " text-center tabular-nums"} type="number" min="1" disabled={item.packaging_type !== 'CARTON'} value={item.items_per_carton || ''} onChange={e => updateItem(i, 'items_per_carton', parseInt(e.target.value) || 0)} />
                        </div>

                        {/* Bonus */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Bonus (U)</label>
                            <input
                                className={inputCls + " text-center tabular-nums text-emerald-700 font-bold"}
                                type="number"
                                min="0"
                                value={item.bonus_quantity || ''}
                                onChange={e => updateItem(i, 'bonus_quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                placeholder="0"
                            />
                        </div>

                        {/* Pur. Rate */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Pur. Rate</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">Rs</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    className={inputCls + " pl-6 font-bold text-slate-800 text-center"}
                                    value={item.unit_price || ''}
                                    onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Sale Rate */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Sale Rate</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">Rs</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    className={inputCls + " pl-6 text-center tabular-nums"}
                                    value={item.selling_price || ''}
                                    onChange={e => updateItem(i, 'selling_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Retail Rate */}
                        <div>
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Retail Rate</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">Rs</span>
                                <input
                                    type="number" min="0" step="0.01"
                                    className={inputCls + " pl-6 text-center tabular-nums"}
                                    value={item.retail_rate || ''}
                                    onChange={e => updateItem(i, 'retail_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Exp Date — enabled only when the product's "Apply Expiry Date" is Yes */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Exp Date</label>
                            <input
                                type="date"
                                disabled={!item.apply_expiry}
                                title={item.apply_expiry ? '' : 'Expiry not applicable for this product'}
                                className={inputCls + " text-center tabular-nums" + (item.apply_expiry ? '' : ' opacity-50 bg-slate-100 cursor-not-allowed')}
                                value={item.expiry_date || ''}
                                onChange={e => updateItem(i, 'expiry_date', e.target.value)}
                            />
                        </div>
                    </div>
                    {item.product && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 justify-between items-center text-[11px] text-slate-500">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>Total Pcs: <b className="text-slate-700 tabular-nums">{(item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity) + (item.bonus_quantity || 0)} Pcs</b></span>
                                {(item.bonus_quantity || 0) > 0 && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span className="text-emerald-700">incl. {item.bonus_quantity} bonus</span>
                                    </>
                                )}
                                {p && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span>Current stock: <b className="text-slate-700 tabular-nums">{p.quantity}</b></span>
                                    </>
                                )}
                                {(item.unit_price > 0 && item.selling_price > 0) && (() => {
                                    const profit = ((item.selling_price - item.unit_price) / item.unit_price) * 100;
                                    return (
                                        <>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span>%Profit: <b className={profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{profit.toFixed(1)}%</b></span>
                                        </>
                                    );
                                })()}
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

    /* ─── Order Items section (identical in both modes) ─── */
    const renderItemsCard = () => (
        <>
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-inset ring-indigo-100 shrink-0">
                        <Package size={17} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Order Items
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">{items.length}</span>
                        </h2>
                        <p className="text-[11.5px] text-slate-500">Products, quantities, and pricing.</p>
                    </div>
                </div>
                <Btn variant="secondary" className="text-[12px] py-1.5 px-3.5 h-8.5" onClick={openAddProduct}><Plus size={14} /> Add New Products</Btn>
            </div>
            <div className="p-5 sm:p-6 bg-white">
                {renderItemsList()}
            </div>
            {/* Settlement & charges — one line: staff, advance, discounts, freight, tax, due date */}
            <div className="px-5 sm:px-6 py-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Field label="Staff">
                    <select className={selectCls} value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value }))}>
                        <option value="">Select any one</option>
                        {staffList.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Paid Now (Advance)">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                        <input className={inputCls + " pl-9"} type="number" min="0" value={(form as any).paid_amount || ''} onChange={e => setForm(f => ({ ...f, paid_amount: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0.00" />
                    </div>
                </Field>
                <Field label="Extra Discount">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                        <input className={inputCls + " pl-9"} type="number" min="0" value={(form as any).extra_discount || ''} onChange={e => setForm(f => ({ ...f, extra_discount: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0.00" />
                    </div>
                </Field>
                <Field label="Freight / Shipping Cost">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                        <input className={inputCls + " pl-9"} type="number" min="0" value={(form as any).shipping_cost || ''} onChange={e => setForm(f => ({ ...f, shipping_cost: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0.00" />
                    </div>
                </Field>
                <Field label="Tax Rate (%)">
                    <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">%</span>
                        <input className={inputCls + " pr-8"} type="number" min="0" value={(form as any).tax_rate || ''} onChange={e => setForm(f => ({ ...f, tax_rate: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0" />
                    </div>
                </Field>
                <Field label="Balance Due Date">
                    <input className={inputCls} type="date" value={(form as any).due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </Field>
            </div>
        </>
    );

    /* ─── Order Information section — shared shell; only the Supplier field differs per mode ─── */
    const renderOrderInfoCard = (supplierField: React.ReactNode) => (
        <>
            <div className="px-5 sm:px-6 py-4 border-y border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-50/80 to-transparent">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center ring-1 ring-inset ring-slate-200 shrink-0">
                    <Building2 size={17} strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Order Information</h2>
                    <p className="text-[11.5px] text-slate-500">Supplier, bill no., staff, and settlement.</p>
                </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Supplier Bill No.">
                    <input className={inputCls} value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Supplier's invoice / bill no." />
                </Field>
                <Field label="Staff">
                    <select className={selectCls} value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value }))}>
                        <option value="">Select any one</option>
                        {staffList.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
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
                        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Freight, Tax, Extra Discount, Balance Date)'}
                    </button>
                </div>

                {showAdvanced && (
                    <>
                        <Field label="Extra Discount">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                                <input
                                    className={inputCls + " pl-9"}
                                    type="number"
                                    min="0"
                                    value={(form as any).extra_discount || ''}
                                    onChange={e => setForm(f => ({ ...f, extra_discount: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                    placeholder="0.00"
                                />
                            </div>
                        </Field>
                        <Field label="Freight / Shipping Cost">
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
        </>
    );

    // Both modes require a REGISTERED supplier chosen from the dropdown. The two
    // modes differ only in how PRODUCTS are entered (custom = typed by hand;
    // supplier = picked from the selected supplier's catalog).
    const supplierField = (
        <SupplierSelector selectedId={form.supplier} suppliers={suppliers} inputCls={selectCls} onSelect={(val: any) => {
            const matched = suppliers.find(c => String(c.id) === String(val));
            setForm(f => ({ ...f, supplier: val, supplier_name: matched?.name || '' }));
        }} />
    );

    return (
        <div className="pb-20">
            <div className="max-w-[1320px] mx-auto">
                <PageHeader
                    title={editId ? `Edit Purchase ${form.purchase_number || ''}`.trim() : 'New Purchase'}
                    subtitle={editId ? 'Update this purchase order — supplier, items, and totals.' : 'Create a purchase order with supplier, items, and totals.'}
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Purchases', href: '/admin/purchases' }, { label: editId ? 'Edit Purchase' : 'New Purchase' }]}
                />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-slate-500">Loading data...</div>
                ) : (
                    <div className="space-y-5">
                        {/* Order Items (rows + settlement fields) — full width */}
                        <Card className="relative z-[10]">
                            {renderItemsCard()}
                        </Card>

                        {/* Previous history (left) + totals panel (right) */}
                        <div className="flex flex-col lg:flex-row gap-5 items-start">
                            {/* LEFT: Previous Purchase History */}
                            <div className="flex-1 min-w-0 w-full">
                                <Card className="overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent flex items-center justify-between gap-3 flex-wrap">
                                        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2"><History size={15} className="text-indigo-600" /> Previous Purchase History</h3>
                                        <Btn variant="secondary" className="text-[12px] py-1.5 px-3.5" loading={histLoading} onClick={loadPrevHistory}>Show Previous History</Btn>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        {!histLoaded ? (
                                            <div className="text-center py-12 text-[12.5px] text-slate-400">Click “Show Previous History” to load past purchases for the products on this order.</div>
                                        ) : histRows.length === 0 ? (
                                            <div className="text-center py-12 text-[12.5px] text-slate-400">No previous purchase history for these products.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-[12px] border-collapse min-w-[640px]">
                                                    <thead>
                                                        <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            <th className="px-3 py-2">Date</th>
                                                            <th className="px-3 py-2">PO No.</th>
                                                            <th className="px-3 py-2">Product</th>
                                                            <th className="px-3 py-2">Supplier</th>
                                                            <th className="px-3 py-2 text-right">Qty</th>
                                                            <th className="px-3 py-2 text-right">Rate</th>
                                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {histRows.map((r, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="px-3 py-2 tabular-nums text-slate-600 whitespace-nowrap">{r.date || '—'}</td>
                                                                <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{r.po}</td>
                                                                <td className="px-3 py-2 text-slate-800">{r.product}</td>
                                                                <td className="px-3 py-2 text-slate-500">{r.supplier}</td>
                                                                <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                                                                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.rate)}</td>
                                                                <td className="px-3 py-2 text-right tabular-nums font-bold">{formatCurrency(r.subtotal)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* RIGHT: totals panel + actions */}
                            <div className="w-full lg:w-[360px] shrink-0">
                            <Card className="overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent">
                                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700">Purchase Summary</h3>
                                </div>
                                <div className="p-5 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide">Amt Purchase</span>
                                        <span className="font-extrabold text-slate-800 tabular-nums text-[13px]">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    {bonusValue > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide">Amt Bonus</span>
                                            <span className="font-extrabold text-emerald-700 tabular-nums text-[13px]">{formatCurrency(bonusValue)}</span>
                                        </div>
                                    )}
                                    {(form as any).shipping_cost > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide">Freight</span>
                                            <span className="font-bold text-slate-700 tabular-nums text-[13px]">+{formatCurrency((form as any).shipping_cost)}</span>
                                        </div>
                                    )}
                                    {taxAmountLive > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide">Tax ({(form as any).tax_rate || 0}%)</span>
                                            <span className="font-bold text-slate-700 tabular-nums text-[13px]">+{formatCurrency(taxAmountLive)}</span>
                                        </div>
                                    )}
                                    {extraDiscount > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide">Extra Disc.</span>
                                            <span className="font-bold text-rose-600 tabular-nums text-[13px]">−{formatCurrency(extraDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-100 my-1" />
                                    <div className="flex justify-between items-center pt-0.5">
                                        <span className="text-slate-800 font-black uppercase text-[12px] tracking-wide">Net Amount</span>
                                        <span className="text-[20px] font-black text-indigo-650 tabular-nums">{formatCurrency(grandTotal)}</span>
                                    </div>
                                    {paidNow > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-600 font-semibold uppercase text-[11px] tracking-wide">Paid Cash</span>
                                            <span className="font-extrabold text-emerald-700 tabular-nums text-[13px]">{formatCurrency(paidNow)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-800 font-black uppercase text-[12px] tracking-wide">Balance</span>
                                        <span className={`text-[16px] font-black tabular-nums ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(balanceDue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide">Status</span>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${paymentPill}`}>{paymentStatus}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-semibold pt-1">Total Products = {items.filter(i => i.product).length}</div>

                                    <div className="pt-3 space-y-2 border-t border-slate-100 mt-2">
                                        <Btn className="w-full justify-center py-3 uppercase tracking-wider font-extrabold text-[12px]" loading={saving} onClick={() => handleSave()} disabled={items.some(i => !i.product)}>
                                            {editId ? 'Update Order' : 'Save Purchase'}
                                        </Btn>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Btn variant="secondary" className="justify-center text-[12px]" onClick={() => router.push('/admin/purchases')}>View</Btn>
                                            <Btn variant="secondary" className="justify-center text-[12px]" onClick={() => router.push('/admin/purchases')}>Cancel</Btn>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
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

            {/* ── Add Product popup (Product Detail) ── */}
            <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title="Add Product" size="md">
                <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Product Name" required>
                            <input className={inputCls} value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bio 7day cream large" autoFocus />
                        </Field>
                        <Field label="Bar Code (auto)">
                            <div className="flex gap-2">
                                <input className={inputCls + ' tabular-nums bg-slate-50'} value={pForm.barcode} onChange={e => setPForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Auto-generated" />
                                <Btn variant="secondary" className="shrink-0 px-2.5 text-[12px]" onClick={() => setPForm(f => ({ ...f, barcode: genBarcode() }))} title="Generate a new bar code"><RefreshCw size={13} /></Btn>
                            </div>
                        </Field>
                    </div>
                    <Field label="Company">
                        <div className="flex gap-2">
                            <select
                                className={selectCls}
                                value={pForm.company}
                                onChange={e => {
                                    const cid = e.target.value;
                                    const comp = companies.find((c: any) => String(c.id) === String(cid));
                                    // Selecting a company auto-fills the Category from that company.
                                    setPForm(f => ({ ...f, company: cid, category: comp?.category || '' }));
                                }}
                            >
                                <option value="">Select any one</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <Btn variant="secondary" className="shrink-0 px-3 text-[12px] whitespace-nowrap" onClick={() => { setCForm({ name: '', category: '' }); setShowCompanyModal(true); }}>
                                <Building2 size={14} /> Find Company
                            </Btn>
                        </div>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Category">
                            <input className={inputCls} value={pForm.category} onChange={e => setPForm(f => ({ ...f, category: e.target.value }))} placeholder="Category" />
                        </Field>
                        <Field label="Packing">
                            <input className={inputCls} type="number" min="1" value={pForm.packing} onChange={e => setPForm(f => ({ ...f, packing: e.target.value }))} placeholder="1" />
                        </Field>
                        <Field label="Re-Order Qty">
                            <input className={inputCls} type="number" min="0" value={pForm.reorder} onChange={e => setPForm(f => ({ ...f, reorder: e.target.value }))} placeholder="0" />
                        </Field>
                        <Field label="Status">
                            <select className={selectCls} value={pForm.status} onChange={e => setPForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </Field>
                        <Field label="Apply Expiry Date">
                            <select className={selectCls} value={pForm.apply_expiry} onChange={e => setPForm(f => ({ ...f, apply_expiry: e.target.value }))}>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <Btn variant="secondary" onClick={() => setShowProductModal(false)}>Cancel</Btn>
                        <Btn loading={savingProduct} onClick={confirmAddProduct}><Plus size={14} /> Add to Purchase</Btn>
                    </div>
                </div>
            </Modal>

            {/* ── Add New Company popup (nested — opens from "Find Company") ── */}
            <Modal open={showCompanyModal} onClose={() => setShowCompanyModal(false)} title="Add New Company" size="sm">
                <div className="space-y-4 text-left">
                    <Field label="Company Name" required>
                        <input className={inputCls} value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amour Company" autoFocus />
                    </Field>
                    <Field label="Company Category">
                        <input className={inputCls} value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Local / Imported / Pakistani" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <Btn variant="secondary" onClick={() => setShowCompanyModal(false)}>Cancel</Btn>
                        <Btn loading={savingCompany} onClick={saveCompanyInline}><Plus size={14} /> Add Company</Btn>
                    </div>
                </div>
            </Modal>

            <WarehouseSelectionModal isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onConfirm={(whId) => handleSave(whId)} loading={saving} />
        </div>
    );
}
