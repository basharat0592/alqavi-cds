"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Search, Plus, RefreshCw, Package, Truck, MapPin, Save,
    ChevronRight, ChevronLeft, ChevronDown, Trash, Loader2, Info, Box, Barcode,
    Building2, Activity, Filter, Trash2, AlertTriangle, X, Calendar,
    ShieldCheck, TrendingUp, Warehouse, History as HistoryIcon
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { inventoryService } from '@/services/inventory.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import { productService } from '@/services/product.service';
import { userService } from '@/services/user.service';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - CURRENT STOCK
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm shadow-indigo-600/20',
        secondary: 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-9 px-4 rounded-lg text-[13px] font-semibold border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
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

/** Custom, theme-matched product autocomplete (replaces the browser's native
 *  <datalist>, which renders an inconsistent dark popup). */
const ProductCombobox = ({ products, value, inputCls, onType, onPick }: {
    products: any[]; value: string; inputCls: string;
    onType: (v: string) => void; onPick: (p: any) => void;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const clean = (n: string) => (n || '').replace(/\s*\(.*?\)\s*$/, '').trim();
    const q = (value || '').toLowerCase().trim();
    const list = (products || [])
        .filter(p => (p.status || '').toUpperCase() === 'ACTIVE')
        .filter(p => !q || (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
        .slice(0, 50);

    return (
        <div className="relative" ref={ref}>
            <input
                className={inputCls + ' pr-9'}
                value={value}
                onChange={(e) => { onType(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Start typing product name..."
                autoComplete="off"
            />
            <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
            {open && list.length > 0 && (
                <div className="absolute z-50 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 py-1 animate-in fade-in zoom-in-95 duration-150">
                    {list.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => { onPick(p); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 truncate">{clean(p.name)}</p>
                                <p className="text-[11px] text-slate-400 font-medium truncate">{p.sku || clean(p.name)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {open && list.length === 0 && q && (
                <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 px-3.5 py-3 text-[12px] text-slate-500">
                    No match — <span className="font-semibold text-slate-700">&ldquo;{value}&rdquo;</span> will be saved as a new product.
                </div>
            )}
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-left animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-[400px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-rose-600 mb-4">
                        <AlertTriangle size={24} />
                        <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">{title}</h3>
                    </div>
                    <p className="text-[14px] text-slate-600 leading-relaxed mb-8">{message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-10 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 h-10 text-[13px] font-semibold text-white bg-rose-600 border border-transparent rounded-lg hover:bg-rose-700 flex items-center justify-center gap-2 shadow-sm shadow-rose-600/20 transition-all"
                        >
                            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete Record
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const inputCls = "w-full h-10 px-3.5 border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 bg-white transition-all";
const selectCls = `${inputCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[position:right_12px_center] bg-no-repeat`;

const AssignLocationModal = ({ isOpen, onClose, onConfirm, warehouses, loading }: any) => {
    const [selected, setSelected] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-left animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-[450px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <MapPin size={18} />
                        </div>
                        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Assign Storage Location</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Select Warehouse</label>
                        <select
                            className={selectCls + " text-[14px]"}
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            autoFocus
                        >
                            <option value="" disabled>Choose target location...</option>
                            {warehouses.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 italic mt-2">This will move the selected batch signature to the physical location chosen above.</p>
                    </div>
                </div>
                <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading} className="px-6 py-1.5 text-[12px] font-bold text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                    <button
                        onClick={() => onConfirm(selected)}
                        disabled={!selected || loading}
                        className="h-10 px-8 bg-indigo-600 border border-transparent rounded-lg text-[13px] font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function InventoryListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialWarehouseId = searchParams.get('warehouse') || '';

    const [view, setView] = useState<'list' | 'form'>('list');
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouseId);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [deleteModal, setDeleteModal] = useState({ open: false, ids: [] as any[], name: '' });
    const [viewingStock, setViewingStock] = useState<any | null>(null);
    const [warehouseModal, setWarehouseModal] = useState<{ open: boolean, stockId: any }>({ open: false, stockId: null });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [form, setForm] = useState<any>({
        product_name: '', category: '', supplier: '', warehouse: '', purchase_type: 'single',
        cartons: '', items_per_carton: '', total_quantity: '', price_per_carton: '', price_per_item: '',
        date: new Date().toISOString().slice(0, 10),
        supplier_product_id: ''
    });

    useEffect(() => {
        if (form.purchase_type === 'carton') {
            const total = (Number(form.cartons) || 0) * (Number(form.items_per_carton) || 0);
            const ppi = Number(form.items_per_carton) > 0 ? (Number(form.price_per_carton) || 0) / Number(form.items_per_carton) : 0;
            if (total !== form.total_quantity || ppi !== form.price_per_item) {
                setForm((f: any) => ({ ...f, total_quantity: total, price_per_item: ppi }));
            }
        }
    }, [form.purchase_type, form.cartons, form.items_per_carton, form.price_per_carton]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [stockData, whData, supRes, catData, prodData, userRes] = await Promise.allSettled([
                inventoryService.getInventory({
                    warehouse: selectedWarehouse,
                    supplier: selectedSupplier,
                    no_pagination: 'true'
                }),
                inventoryService.getWarehouses(),
                companyService.getSuppliers(),
                categoryService.getAll(),
                productService.getAllSupplier({ no_pagination: 'true' }),
                userService.getAll()
            ]);

            if (stockData.status === 'fulfilled') setStocks(stockData.value || []);
            if (whData.status === 'fulfilled') setWarehouses(whData.value || []);

            const fromUsers = userRes.status === 'fulfilled' ? (Array.isArray(userRes.value) ? userRes.value : []).filter((u: any) => (u.role_name || '').toLowerCase().includes('supplier')).map((u: any) => ({
                id: u.id, name: u.business_name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
            })) : [];
            const fromCompany = supRes.status === 'fulfilled' ? (Array.isArray(supRes.value) ? supRes.value : []).map((s: any) => ({
                id: s.id, name: s.company || s.name
            })) : [];
            const mergedSuppliers = Array.from(new Map([...fromCompany, ...fromUsers].map(s => [s.name, s])).values());
            setSuppliers(mergedSuppliers);

            if (catData.status === 'fulfilled') setCategories(catData.value || []);
            if (prodData.status === 'fulfilled') setAllProducts((prodData.value as any).results || prodData.value || []);
        } catch {
            if (!silent) toast.error("Connection Error");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [selectedWarehouse, selectedSupplier]);

    useEffect(() => { loadData(); setCurrentPage(1); }, [loadData, search, selectedWarehouse, selectedSupplier]);

    // AUTO-SYNC (2s)
    useEffect(() => {
        if (view !== 'list') return;
        const interval = setInterval(() => {
            if (!loading && !isSubmitting) loadData(true);
        }, 2000);
        return () => clearInterval(interval);
    }, [view, loading, isSubmitting, loadData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_name || !form.warehouse) return toast.error("Please fill required fields (Name and Warehouse)");

        setIsSubmitting(true);
        try {
            const payload = {
                product_name: form.product_name,
                category: form.category || null,
                supplier: form.supplier || null,
                warehouse: form.warehouse,
                purchase_type: form.purchase_type,
                total_quantity: Number(form.total_quantity),
                price_per_item: Number(form.price_per_item),
                date: form.date,
                cartons: form.purchase_type === 'carton' ? Number(form.cartons) : null,
                items_per_carton: form.purchase_type === 'carton' ? Number(form.items_per_carton) : null,
                price_per_carton: form.purchase_type === 'carton' ? Number(form.price_per_carton) : null,
            };

            if (isEditing && editingId) {
                await inventoryService.updateInventory(editingId, payload);
                toast.success("Stock updated");
            } else {
                await inventoryService.createStock(payload);
                toast.success("Stock added");
            }
            setView('list'); loadData();
        } catch (e: any) {
            console.error("Save Error:", e);
            const errorMsg = e.response?.data ? Object.entries(e.response.data).map(([k, v]: any) => `${k}: ${v}`).join(', ') : 'Write error';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.ids || deleteModal.ids.length === 0) return;
        setIsSubmitting(true);
        try {
            // Delete all stock records associated with this product across all warehouses
            await Promise.all(deleteModal.ids.map((id: any) => inventoryService.deleteInventory(id)));
            toast.success(`'${deleteModal.name}' removed from all warehouses`);
            loadData();
            setDeleteModal({ open: false, ids: [], name: '' });
        } catch {
            toast.error('Could not complete global purge. Check dependencies.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignWarehouse = async (warehouseId: string) => {
        if (!warehouseModal.stockId) return;
        setIsSubmitting(true);
        try {
            await inventoryService.updateInventory(warehouseModal.stockId, { warehouse: warehouseId });
            toast.success("Warehouse assigned successfully");
            loadData();
            setWarehouseModal({ open: false, stockId: null });
        } catch (e: any) {
            console.error("Assign Error:", e);
            toast.error(e.response?.data?.error || "Failed to assign warehouse");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSupplierName = useCallback((id: any, fallback: string) => {
        const sup = suppliers.find(s => String(s.id) === String(id));
        return sup ? sup.name : fallback;
    }, [suppliers]);

    const filtered = React.useMemo(() => {
        const raw = (stocks || []).filter(i => {
            const resolvedSupplierName = getSupplierName(i.supplier, i.supplier_name);
            const matchesSearch = `${i.product_name} ${resolvedSupplierName}`.toLowerCase().includes(search.toLowerCase());
            const matchesSupplier = !selectedSupplier || String(i.supplier) === String(selectedSupplier);
            const matchesWarehouse = !selectedWarehouse || String(i.warehouse) === String(selectedWarehouse);
            return matchesSearch && matchesSupplier && matchesWarehouse;
        });

        // Group by [Name + Price] only (per user request: merge even if warehouse is different)
        const groups = new Map();
        raw.forEach(item => {
            // Create a unique key for this batch type (including weight and size)
            const key = `${item.product_name.toLowerCase().trim()}_${item.price_per_item}_${item.weight || ''}_${item.size || ''}`;

            if (!groups.has(key)) {
                groups.set(key, { ...item, items: [item] });
            } else {
                const g = groups.get(key);
                g.items.push(item);
                g.total_quantity += item.total_quantity;
                g.cartons = (g.cartons || 0) + (item.cartons || 0);

                // If warehouses are different, mark as 'Multiple'
                if (g.warehouse_name !== item.warehouse_name) {
                    g.warehouse_name = 'Multiple';
                }

                // If suppliers are different, mark as 'Multiple'
                if (g.supplier_name !== item.supplier_name) {
                    g.supplier_name = 'Multiple';
                    g.supplier = null;
                }

                // Update date to latest arrival in this batch group
                if (new Date(item.updated_at || item.date) > new Date(g.updated_at || g.date)) {
                    g.updated_at = item.updated_at;
                    g.date = item.date;
                }
            }
        });
        return Array.from(groups.values());
    }, [stocks, search, selectedSupplier, selectedWarehouse]);

    // Only show products in catalog that are already in our stock list
    const catalogProductsInStock = React.useMemo(() => {
        const stockNames = new Set((stocks || []).map(s => (s.product_name || '').toLowerCase().trim()));
        return (allProducts || []).filter(p =>
            p.status === 'ACTIVE' &&
            stockNames.has((p.name || '').toLowerCase().trim())
        );
    }, [allProducts, stocks]);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, currentPage]);

    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <div className="pb-20 text-left text-slate-800">
            <div className="max-w-[1440px] mx-auto">

                <PageHeader
                    title={view === 'list' ? 'Current Stock' : (isEditing ? 'Edit Item' : 'New Stock')}
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: view === 'list' ? 'Current Stock' : (isEditing ? 'Edit Item' : 'New Stock') },
                    ]}
                    actions={view === 'list' ? (
                        <>
                            <Btn variant="secondary" onClick={loadData} loading={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
                            </Btn>
                            <Btn onClick={() => {
                                setForm({ product_name: '', category: '', supplier: '', warehouse: selectedWarehouse || '', purchase_type: 'single', cartons: '', items_per_carton: '', total_quantity: '', price_per_carton: '', price_per_item: '', date: new Date().toISOString().slice(0, 10), supplier_product_id: '' });
                                setIsEditing(false); setView('form');
                            }} className="whitespace-nowrap"><Plus size={14} /> Add Stock</Btn>
                        </>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-bold whitespace-nowrap">
                            <ChevronLeft size={14} /> Back to Current Stock
                        </button>
                    )}
                />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Filters */}
                        <Card className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by product or supplier..."
                                    className={`${inputCls} pl-10`}
                                />
                            </div>
                            <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block" />
                            <div className="relative flex-1 md:flex-initial md:min-w-[200px]">
                                <select
                                    value={selectedWarehouse}
                                    onChange={e => setSelectedWarehouse(e.target.value)}
                                    className={`${selectCls} font-semibold`}
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                </select>
                            </div>
                            <div className="relative flex-1 md:flex-initial md:min-w-[200px]">
                                <select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className={`${selectCls} font-semibold`}
                                >
                                    <option value="">All Suppliers</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </Card>

                        {/* ── Mobile Card List ── */}
                        <div className="md:hidden space-y-3 mb-6">
                            {loading && stocks.length === 0 ? (
                                <Card className="py-16 text-center">
                                    <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
                                    <p className="text-[13px] text-slate-500 font-medium italic">Syncing Current Stock...</p>
                                </Card>
                            ) : paginatedData.length === 0 ? (
                                <Card className="py-16 text-center">
                                    <div className="mb-3 text-slate-200"><Box size={40} className="mx-auto" /></div>
                                    <p className="text-[13px] text-slate-500 font-medium">No stock records match search.</p>
                                </Card>
                            ) : (
                                paginatedData.map(s => (
                                    <Card key={s.id} className="p-4 space-y-3 text-left">
                                        {/* Row 1: Image + Item Title & Info */}
                                        <div className="flex gap-3">
                                            <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                {s.product_image ? (
                                                    <img
                                                        src={getImageUrl(s.product_image)}
                                                        className="w-full h-full object-contain p-1"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <Package size={24} className="text-slate-200" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-1.5 flex-wrap" onClick={() => setViewingStock(s)}>
                                                    <h3 className="text-[14px] font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer">
                                                        {s.product_name.replace(/\s*\(.*?\)\s*$/, '')}
                                                    </h3>
                                                    {(s.weight || s.size) && (
                                                        <span className="text-[9px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                                            — {s.weight}{s.weight && s.size ? ' • ' : ''}{s.size}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter">{s.category_name || 'Category not set'}</div>
                                            </div>
                                        </div>

                                        {/* Row 2: Stock Level & Price */}
                                        <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-slate-100 text-[12px]">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Stock Level</div>
                                                <div className="text-[15px] font-bold text-slate-900 mt-0.5 tabular-nums">
                                                    {s.total_quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal ml-0.5">Units</span>
                                                </div>
                                                <div className="text-[9px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">
                                                    {s.purchase_type === 'carton' ? `${s.cartons} Boxes` : 'Loose Units'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Unit Price</div>
                                                <div className="font-bold text-slate-900 text-[15px] mt-0.5 tabular-nums">{formatCurrency(s.price_per_item)}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Single Cost</div>
                                            </div>
                                        </div>

                                        {/* Row 3: Supplier, Warehouse & Last Updated */}
                                        <div className="space-y-1.5 text-[11px] text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Truck size={13} className="text-slate-400 shrink-0" />
                                                <span className="font-semibold text-slate-900">{getSupplierName(s.supplier, s.supplier_name)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                                {s.warehouse_name ? (
                                                    <span className="font-semibold text-slate-900">{s.warehouse_name}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => setWarehouseModal({ open: true, stockId: s.id })}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-dashed border-indigo-400 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-[9px] font-bold transition-all"
                                                    >
                                                        <Plus size={8} strokeWidth={3} /> Assign Location
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-100">
                                                <span className="font-medium">Updated:</span>
                                                <span className="text-slate-900 font-bold">
                                                    {new Date(s.updated_at || s.created_at || s.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-slate-900 font-bold">
                                                    {new Date(s.updated_at || s.created_at || s.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 4: Action Controls */}
                                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => setViewingStock(s)}
                                                className="text-[12px] font-bold text-slate-600 hover:underline"
                                            >
                                                View
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                onClick={() => {
                                                    setForm({ product_name: s.product_name, category: s.category || '', supplier: s.supplier, warehouse: s.warehouse, purchase_type: s.purchase_type, cartons: s.cartons || '', items_per_carton: s.items_per_carton || '', total_quantity: s.total_quantity, price_per_carton: s.price_per_carton || '', price_per_item: s.price_per_item, date: s.date, supplier_product_id: '' });
                                                    setIsEditing(true); setEditingId(s.id); setView('form');
                                                }}
                                                className="text-[12px] font-bold text-indigo-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                onClick={() => setDeleteModal({
                                                    open: true,
                                                    ids: s.items.map((i: any) => i.id),
                                                    name: s.product_name
                                                })}
                                                className="text-[12px] font-bold text-[#c40000] hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>

                        {/* ── Desktop Table ── */}
                        <Card className="hidden md:block overflow-hidden animate-in fade-in duration-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3 w-[80px]">Image</th>
                                        <th className="px-6 py-3">Item Detail</th>
                                        <th className="px-6 py-3 text-right">Stock Level</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                        <th className="px-6 py-3">Shipping & Storage</th>
                                        <th className="px-6 py-3">Last Updated</th>
                                        <th className="px-6 py-3 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading && stocks.length === 0 ? (
                                        <tr><td colSpan={7} className="py-24 text-center">
                                            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
                                            <p className="text-[13px] text-slate-500 font-medium italic">Syncing Current Stock...</p>
                                        </td></tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr><td colSpan={7} className="py-24 text-center">
                                            <div className="mb-4 text-slate-200"><Box size={60} className="mx-auto" /></div>
                                            <p className="text-[14px] text-slate-500 font-medium">No stock records match your search.</p>
                                        </td></tr>
                                    ) : (
                                        paginatedData.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                                <td className="px-6 py-4">
                                                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                                                        {s.product_image ? (
                                                            <img
                                                                src={getImageUrl(s.product_image)}
                                                                className="w-full h-full object-contain p-1"
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <Package size={20} className="text-slate-200" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => setViewingStock(s)}>
                                                        <div className="text-[14px] font-bold text-slate-900 group-hover:text-indigo-600 group-hover:underline">
                                                            {s.product_name.replace(/\s*\(.*?\)\s*$/, '')}
                                                        </div>
                                                        {(s.weight || s.size) && (
                                                            <div className="text-[10px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                                                — {s.weight}{s.weight && s.size ? ' • ' : ''}{s.size}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 uppercase font-bold mt-1 tracking-tighter">{s.category_name || 'Category not set'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-[16px] font-bold text-slate-900 tabular-nums">{s.total_quantity.toLocaleString()} <span className="text-[11px] text-slate-400 font-normal ml-0.5">Units</span></div>
                                                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                                                        {s.purchase_type === 'carton' ? `${s.cartons} Boxes` : 'Loose Units'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-bold text-slate-900 text-[15px] tabular-nums">{formatCurrency(s.price_per_item)}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Single Unit Cost</div>
                                                </td>
                                                <td className="px-6 py-4 text-[12px]">
                                                    <div className="text-slate-900 font-bold flex items-center gap-1.5"><Truck size={14} className="text-slate-400" /> {getSupplierName(s.supplier, s.supplier_name)}</div>
                                                    <div className="text-slate-600 flex items-center gap-1.5 mt-1.5">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        {s.warehouse_name ? (
                                                            s.warehouse_name
                                                        ) : (
                                                            <button
                                                                onClick={() => setWarehouseModal({ open: true, stockId: s.id })}
                                                                className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 border border-dashed border-indigo-400 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-solid rounded-lg text-[10px] font-bold transition-all animate-pulse shadow-sm"
                                                            >
                                                                <Plus size={10} strokeWidth={3} /> Assign Location
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[12px] text-slate-900 font-bold">
                                                        {new Date(s.updated_at || s.created_at || s.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">
                                                        {new Date(s.updated_at || s.created_at || s.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            onClick={() => setViewingStock(s)}
                                                            className="text-[12px] font-bold text-slate-600 hover:underline"
                                                        >
                                                            View
                                                        </button>
                                                        <span className="text-slate-300">|</span>
                                                        <button onClick={() => {
                                                            setForm({ product_name: s.product_name, category: s.category || '', supplier: s.supplier, warehouse: s.warehouse, purchase_type: s.purchase_type, cartons: s.cartons || '', items_per_carton: s.items_per_carton || '', total_quantity: s.total_quantity, price_per_carton: s.price_per_carton || '', price_per_item: s.price_per_item, date: s.date, supplier_product_id: '' });
                                                            setIsEditing(true); setEditingId(s.id); setView('form');
                                                        }} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                                        <span className="text-slate-300">|</span>
                                                        <button
                                                            onClick={() => setDeleteModal({
                                                                open: true,
                                                                ids: s.items.map((i: any) => i.id),
                                                                name: s.product_name
                                                            })}
                                                            className="text-[12px] font-bold text-[#c40000] hover:underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </Card>

                        {/* ── Pagination Controls ── */}
                        <div className="px-4 py-4 sm:px-6 bg-slate-50/60 border border-slate-200/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-[12px] sm:text-[13px] text-slate-600 text-center sm:text-left">
                                Showing <span className="font-bold text-slate-900 tabular-nums">{filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-900 tabular-nums">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-slate-900 tabular-nums">{filtered.length}</span> items
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || filtered.length === 0}
                                    className="h-[31px] px-3 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 transition-all"
                                >
                                    <ChevronLeft size={16} /> <span className="hidden xs:inline">Previous</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {totalPages > 0 && Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`h-[31px] w-[31px] flex items-center justify-center rounded-lg text-[13px] font-bold transition-all tabular-nums ${currentPage === i + 1 ? 'bg-indigo-600 border border-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || filtered.length === 0}
                                    className="h-[31px] px-3 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 transition-all"
                                >
                                    <span className="hidden xs:inline">Next</span> <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">
                        <div className="flex-1 space-y-8">
                            {/* Product Info */}
                            <Card className="overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">1. Choose Product</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="col-span-full">
                                            <Field label="Product Name (Select or Type New)" required>
                                                <ProductCombobox
                                                    products={allProducts}
                                                    value={form.product_name}
                                                    inputCls={inputCls}
                                                    onType={(val) => {
                                                        const p = allProducts.find(item => item.name === val);
                                                        setForm((f: any) => ({
                                                            ...f,
                                                            product_name: val,
                                                            supplier_product_id: p ? String(p.id) : '',
                                                            supplier: p ? p.supplier : f.supplier,
                                                            category: p ? p.category : f.category,
                                                            price_per_item: p ? p.cost_price || p.price : f.price_per_item
                                                        }));
                                                    }}
                                                    onPick={(p) => {
                                                        setForm((f: any) => ({
                                                            ...f,
                                                            product_name: p.name,
                                                            supplier_product_id: String(p.id),
                                                            supplier: p.supplier,
                                                            category: p.category,
                                                            price_per_item: p.cost_price || p.price
                                                        }));
                                                    }}
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Category Group">
                                            <select className={selectCls} value={form.category} onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Supplier">
                                            <select className={selectCls} value={form.supplier} onChange={(e) => setForm((f: any) => ({ ...f, supplier: e.target.value }))}>
                                                <option value="">Select Partner</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Target Warehouse" required>
                                            <select className={selectCls} value={form.warehouse} onChange={(e) => setForm((f: any) => ({ ...f, warehouse: e.target.value }))}>
                                                <option value="">Select Storehouse</option>
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Arrival Date" required>
                                            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f: any) => ({ ...f, date: e.target.value }))} />
                                        </Field>
                                    </div>
                                </div>
                            </Card>

                            {/* Quantity & Price */}
                            <Card className="overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">2. Quantity & Pricing</h2>
                                </div>
                                <div className="p-6 space-y-8">
                                    <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-[2px] w-[220px]">
                                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, purchase_type: 'single' }))} className={`flex-1 h-7 text-[11px] font-bold uppercase rounded-md transition-all ${form.purchase_type === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>One Unit</button>
                                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, purchase_type: 'carton' }))} className={`flex-1 h-7 text-[11px] font-bold uppercase rounded-md transition-all ${form.purchase_type === 'carton' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>By Box</button>
                                    </div>

                                    {form.purchase_type === 'carton' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in zoom-in-95 duration-200">
                                            <Field label="Total Boxes">
                                                <input type="number" className={inputCls} value={form.cartons} onChange={(e) => setForm((f: any) => ({ ...f, cartons: e.target.value }))} placeholder="0" />
                                            </Field>
                                            <Field label="Units in Box">
                                                <input type="number" className={inputCls} value={form.items_per_carton} onChange={(e) => setForm((f: any) => ({ ...f, items_per_carton: e.target.value }))} placeholder="0" />
                                            </Field>
                                            <Field label="Price per Box">
                                                <input type="number" step="0.01" className={inputCls} value={form.price_per_carton} onChange={(e) => setForm((f: any) => ({ ...f, price_per_carton: e.target.value }))} placeholder="0" />
                                            </Field>
                                            <div className="sm:col-span-3 grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                                <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Total Units</p><p className="text-[20px] font-bold text-slate-900 tabular-nums">{form.total_quantity || 0} <span className="text-[13px] font-medium text-slate-500">Units</span></p></div>
                                                <div><p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Cost per Unit</p><p className="text-[20px] font-bold text-slate-900 tabular-nums">{formatCurrency(form.price_per_item || 0)}</p></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in zoom-in-95 duration-200">
                                            <Field label="Total Quantity" required>
                                                <input type="number" className={inputCls} value={form.total_quantity} onChange={(e) => setForm((f: any) => ({ ...f, total_quantity: e.target.value }))} placeholder="0" />
                                            </Field>
                                            <Field label="Price per Unit" required>
                                                <input type="number" step="0.01" className={inputCls} value={form.price_per_unit || form.price_per_item} onChange={(e) => setForm((f: any) => ({ ...f, price_per_item: e.target.value }))} placeholder="0" />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="w-full lg:w-[300px] shrink-0 space-y-6">
                            <Card className="overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Actions</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <Btn className="w-full h-10 text-[14px] justify-center font-semibold" onClick={handleSave} loading={isSubmitting}>
                                        <Save size={14} /> {isEditing ? 'Update Stock' : 'Save Stock'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold text-center">
                                        Cancel
                                    </button>
                                </div>
                            </Card>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-[12px] text-indigo-700 leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                <p className="font-bold mb-2 uppercase tracking-wide">Stock Policy</p>
                                Adding stock arrival will automatically increase the recorded units in the specific warehouse chosen.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, ids: [], name: '' })}
                onConfirm={handleDelete}
                loading={isSubmitting}
                title={`Delete '${deleteModal.name.replace(/\s*\(.*?\)\s*$/, '')}'?`}
                message={`Yeh product TAMAM (allover) warehouses se khatam ho jayega. Are you sure you want to permanently remove this product from the entire global inventory?`}
            />

            <AssignLocationModal
                isOpen={warehouseModal.open}
                onClose={() => setWarehouseModal({ open: false, stockId: null })}
                onConfirm={handleAssignWarehouse}
                loading={isSubmitting}
                warehouses={warehouses}
            />

            {viewingStock && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-left animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-[850px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

                        {/* ── Simple Header ── */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package size={20} className="text-slate-400" />
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{viewingStock.product_name.replace(/\s*\(.*?\)\s*$/, '')}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{viewingStock.category_name || 'General Inventory'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingStock(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ── Content ── */}
                        <div className="max-h-[80vh] overflow-y-auto">
                            <div className="p-6 space-y-8">

                                {/* 1. Key Metrics Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200/70 rounded-2xl divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
                                    <div className="p-5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Current Stock</p>
                                        <p className="text-[28px] font-bold text-slate-900 tabular-nums">{viewingStock.total_quantity.toLocaleString()} <span className="text-[13px] font-normal text-slate-400">Units</span></p>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Unit Cost</p>
                                        <p className="text-[28px] font-bold text-slate-900 tabular-nums">{formatCurrency(viewingStock.price_per_item)}</p>
                                    </div>
                                    <div className="p-5 bg-slate-50">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Total Valuation</p>
                                        <p className="text-[28px] font-bold text-indigo-600 tabular-nums">{formatCurrency(viewingStock.total_quantity * viewingStock.price_per_item)}</p>
                                    </div>
                                </div>

                                 {/* 2. Distribution & Details */}
                                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                     <div className="space-y-4">
                                         <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-2">Location Breakdown</h4>
                                         <div className="space-y-2">
                                             {Object.entries((viewingStock.items || []).reduce((acc: any, curr: any) => {
                                                 const name = curr.warehouse_name || 'Unassigned';
                                                 acc[name] = (acc[name] || 0) + curr.total_quantity;
                                                 return acc;
                                             }, {})).map(([whName, whTotal]: [string, any]) => (
                                                 <div key={whName} className="flex items-center justify-between text-[13px] py-1">
                                                     <div className="flex items-center gap-2 text-slate-600">
                                                         <MapPin size={14} className="text-slate-400" />
                                                         <span>{whName}</span>
                                                     </div>
                                                     <span className="font-bold text-slate-900 tabular-nums">{whTotal.toLocaleString()} units</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>

                                     <div className="space-y-4">
                                         <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-2">Partner Breakdown</h4>
                                         <div className="space-y-2">
                                             {Object.entries((viewingStock.items || []).reduce((acc: any, curr: any) => {
                                                 const name = getSupplierName(curr.supplier, curr.supplier_name) || 'Unknown';
                                                 acc[name] = (acc[name] || 0) + curr.total_quantity;
                                                 return acc;
                                             }, {})).map(([supName, supTotal]: [string, any]) => (
                                                 <div key={supName} className="flex items-center justify-between text-[13px] py-1">
                                                     <div className="flex items-center gap-2 text-slate-600">
                                                         <Truck size={14} className="text-slate-400" />
                                                         <span>{supName}</span>
                                                     </div>
                                                     <span className="font-bold text-emerald-600 tabular-nums">{supTotal.toLocaleString()} units</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>

                                     <div className="space-y-4">
                                         <h4 className="text-[13px] font-bold text-slate-900 border-b border-slate-100 pb-2">Technical Specs</h4>
                                         <div className="grid grid-cols-2 gap-4 text-[12px]">
                                             <div>
                                                 <p className="text-slate-400 mb-0.5">Weight</p>
                                                 <p className="font-bold text-slate-900">{viewingStock.weight || '---'}</p>
                                             </div>
                                             <div>
                                                 <p className="text-slate-400 mb-0.5">Variant / Type</p>
                                                 <p className="font-bold text-slate-900">{viewingStock.size || '---'}</p>
                                             </div>
                                             <div>
                                                 <p className="text-slate-400 mb-0.5">SKU</p>
                                                 <p className="font-bold text-slate-900">{viewingStock.sku || '---'}</p>
                                             </div>
                                             <div>
                                                 <p className="text-slate-400 mb-0.5">Barcode</p>
                                                 <p className="font-bold text-slate-900">{viewingStock.barcode || '---'}</p>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* 3. Arrival Log */}
                                 <div className="space-y-4">
                                     <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                         <h4 className="text-[13px] font-bold text-slate-900">Source & Arrival Log</h4>
                                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Traceability</span>
                                     </div>
                                     <div className="border border-slate-200/70 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                         <table className="w-full text-left text-[12px] border-collapse">
                                             <thead>
                                                 <tr className="bg-slate-50/60 border-b border-slate-200 font-bold text-slate-400 uppercase tracking-wider">
                                                     <th className="px-4 py-3">Arrival Date & Time</th>
                                                     <th className="px-4 py-3">Source Supplier</th>
                                                     <th className="px-4 py-3">Destination</th>
                                                     <th className="px-4 py-3 text-right">Batch Qty</th>
                                                     <th className="px-4 py-3 text-right">Unit Price</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-slate-100">
                                                 {(viewingStock.items || [viewingStock]).sort((a: any, b: any) => new Date(b.updated_at || b.date).getTime() - new Date(a.updated_at || a.date).getTime()).map((item: any, idx: number) => (
                                                     <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                         <td className="px-4 py-3">
                                                             <div className="font-bold text-slate-900">{new Date(item.updated_at || item.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                             <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                                 {new Date(item.updated_at || item.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                             </div>
                                                         </td>
                                                         <td className="px-4 py-3 font-medium text-indigo-600 group-hover:underline cursor-default">
                                                             <div className="flex items-center gap-2">
                                                                 <Truck size={14} className="text-slate-300" />
                                                                 {getSupplierName(item.supplier, item.supplier_name)}
                                                             </div>
                                                         </td>
                                                         <td className="px-4 py-3 text-slate-600">
                                                             <div className="flex items-center gap-2 font-medium">
                                                                 <MapPin size={12} className="text-slate-300" />
                                                                 {item.warehouse_name}
                                                             </div>
                                                         </td>
                                                         <td className="px-4 py-3 text-right">
                                                             <div className="font-black text-emerald-600 tabular-nums">+{item.total_quantity.toLocaleString()}</div>
                                                             <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Units</div>
                                                         </td>
                                                         <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">
                                                             {formatCurrency(item.price_per_item)}
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        {/* ── Simple Footer ── */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button
                                onClick={() => setViewingStock(null)}
                                className="h-10 px-8 bg-indigo-600 border border-transparent rounded-lg text-[13px] font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
