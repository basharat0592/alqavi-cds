"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Search, Plus, Edit2, RefreshCw, Package, Truck, MapPin, Save,
    ChevronRight, ChevronLeft, Trash, Loader2, Info, Box, Barcode,
    Building2, Activity, Filter, Trash2, AlertTriangle, Eye, X, Calendar,
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

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - STOCK ROOM
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

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-left animate-in fade-in duration-200">
            <div className="bg-white rounded-[4px] border border-[#ddd] max-w-[400px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertTriangle size={24} />
                        <h3 className="text-[17px] font-bold">{title}</h3>
                    </div>
                    <p className="text-[14px] text-[#565959] leading-relaxed mb-8">{message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-[35px] text-[13px] font-bold text-[#565959] bg-white border border-[#ddd] rounded-[3px] hover:bg-[#fcfdff] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 h-[35px] text-[13px] font-bold text-white bg-red-600 border border-red-700 rounded-[3px] hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all"
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

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";
const selectCls = `${inputCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[position:right_12px_center] bg-no-repeat`;

const AssignLocationModal = ({ isOpen, onClose, onConfirm, warehouses, loading }: any) => {
    const [selected, setSelected] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-left animate-in fade-in duration-200">
            <div className="bg-white rounded-[4px] border border-[#ddd] max-w-[450px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white border border-[#ddd] rounded flex items-center justify-center text-[#007185]">
                            <MapPin size={18} />
                        </div>
                        <h3 className="text-[15px] font-bold text-[#111]">Assign Storage Location</h3>
                    </div>
                    <button onClick={onClose} className="text-[#565959] hover:text-[#111] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Select Warehouse</label>
                        <select
                            className={selectCls + " h-[40px] text-[14px]"}
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            autoFocus
                        >
                            <option value="" disabled>Choose target location...</option>
                            {warehouses.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-[#565959] italic mt-2">This will move the selected batch signature to the physical location chosen above.</p>
                    </div>
                </div>
                <div className="px-8 py-5 bg-[#f7f8fa] border-t border-[#ddd] flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading} className="px-6 py-1.5 text-[12px] font-bold text-[#565959] hover:text-[#111] transition-all">Cancel</button>
                    <button
                        onClick={() => onConfirm(selected)}
                        disabled={!selected || loading}
                        className="h-[35px] px-8 bg-[#f0c14b] border border-[#a88734] rounded-[3px] text-[13px] font-bold text-[#111] hover:bg-[#eeb933] transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
                id: u.id, name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
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

    const filtered = React.useMemo(() => {
        const raw = (stocks || []).filter(i => {
            const matchesSearch = `${i.product_name} ${i.supplier_name}`.toLowerCase().includes(search.toLowerCase());
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
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Stock Room</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Stock Room' : (isEditing ? 'Edit Item' : 'New Stock')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={loadData} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => {
                                setForm({ product_name: '', category: '', supplier: '', warehouse: selectedWarehouse || '', purchase_type: 'single', cartons: '', items_per_carton: '', total_quantity: '', price_per_carton: '', price_per_item: '', date: new Date().toISOString().slice(0, 10), supplier_product_id: '' });
                                setIsEditing(false); setView('form');
                            }}><Plus size={14} /> Add Stock</Btn>
                        </div>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1 font-bold">
                            <ChevronLeft size={14} /> Back to Stock Room
                        </button>
                    )}
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="relative flex-1 min-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by product or supplier..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                />
                            </div>
                            <div className="h-8 w-px bg-[#eee] mx-2 hidden sm:block" />
                            <div className="relative min-w-[200px]">
                                <select
                                    value={selectedWarehouse}
                                    onChange={e => setSelectedWarehouse(e.target.value)}
                                    className={`${selectCls} h-[35px] font-bold`}
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                </select>
                            </div>
                            <div className="relative min-w-[200px]">
                                <select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className={`${selectCls} h-[35px] font-bold`}
                                >
                                    <option value="">All Suppliers</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                        <th className="px-6 py-3 w-[80px]">Image</th>
                                        <th className="px-6 py-3">Item Detail</th>
                                        <th className="px-6 py-3 text-right">Stock Level</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                        <th className="px-6 py-3">Shipping & Storage</th>
                                        <th className="px-6 py-3">Last Updated</th>
                                        <th className="px-6 py-3 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading && stocks.length === 0 ? (
                                        <tr><td colSpan={7} className="py-24 text-center">
                                            <Loader2 size={32} className="animate-spin text-[#c45500] mx-auto mb-3" />
                                            <p className="text-[13px] text-[#565959] font-medium italic">Syncing Stock Room...</p>
                                        </td></tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr><td colSpan={7} className="py-24 text-center">
                                            <div className="mb-4 opacity-10"><Box size={60} className="mx-auto" /></div>
                                            <p className="text-[14px] text-[#565959] font-medium">No stock records match your search.</p>
                                        </td></tr>
                                    ) : (
                                        paginatedData.map(s => (
                                            <tr key={s.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                                <td className="px-6 py-4">
                                                    <div className="w-12 h-12 bg-white rounded border border-[#ddd] overflow-hidden flex items-center justify-center group-hover:border-[#e77600] transition-colors">
                                                        {s.product_image ? (
                                                            <img
                                                                src={getImageUrl(s.product_image)}
                                                                className="w-full h-full object-contain p-1"
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <Package size={20} className="text-gray-200" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-baseline gap-1.5 group-hover:text-[#007185] cursor-pointer" onClick={() => setViewingStock(s)}>
                                                        <div className="text-[14px] font-bold text-[#111] group-hover:text-[#007185] group-hover:underline">{s.product_name}</div>
                                                        {(s.weight || s.size) && (
                                                            <div className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                                                — {s.weight}{s.weight && s.size ? ' • ' : ''}{s.size}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-[#565959] uppercase font-bold mt-1 tracking-tighter">{s.category_name || 'Category not set'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-[16px] font-bold text-[#111]">{s.total_quantity.toLocaleString()} <span className="text-[11px] text-slate-400 font-normal ml-0.5">Units</span></div>
                                                    <div className="text-[10px] text-[#007600] font-black uppercase tracking-widest mt-1">
                                                        {s.purchase_type === 'carton' ? `${s.cartons} Boxes` : 'Loose Units'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-bold text-[#B12704] text-[15px]">{formatCurrency(s.price_per_item)}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Single Unit Cost</div>
                                                </td>
                                                <td className="px-6 py-4 text-[12px]">
                                                    <div className="text-[#111] font-bold flex items-center gap-1.5"><Truck size={14} className="text-[#adb1b8]" /> {s.supplier_name}</div>
                                                    <div className="text-[#565959] flex items-center gap-1.5 mt-1.5">
                                                        <MapPin size={12} className="text-[#adb1b8]" />
                                                        {s.warehouse_name ? (
                                                            s.warehouse_name
                                                        ) : (
                                                            <button
                                                                onClick={() => setWarehouseModal({ open: true, stockId: s.id })}
                                                                className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 border border-dashed border-[#007185] bg-[#f2fcfd] text-[#007185] hover:bg-[#e1f5f8] hover:border-solid rounded-[3px] text-[10px] font-bold transition-all animate-pulse shadow-sm"
                                                            >
                                                                <Plus size={10} strokeWidth={3} /> Assign Location
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[12px] text-[#111] font-bold">
                                                        {new Date(s.updated_at || s.created_at || s.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[10px] text-[#565959] font-bold uppercase mt-0.5 tracking-tighter">
                                                        {new Date(s.updated_at || s.created_at || s.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewingStock(s)}
                                                            className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#007185] shadow-sm"
                                                            title="View Details"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button onClick={() => {
                                                            setForm({ product_name: s.product_name, category: s.category || '', supplier: s.supplier, warehouse: s.warehouse, purchase_type: s.purchase_type, cartons: s.cartons || '', items_per_carton: s.items_per_carton || '', total_quantity: s.total_quantity, price_per_carton: s.price_per_carton || '', price_per_item: s.price_per_item, date: s.date, supplier_product_id: '' });
                                                            setIsEditing(true); setEditingId(s.id); setView('form');
                                                        }} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm"><Edit2 size={14} /></button>
                                                        <button
                                                            onClick={() => setDeleteModal({
                                                                open: true,
                                                                ids: s.items.map((i: any) => i.id),
                                                                name: s.product_name
                                                            })}
                                                            className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600 shadow-sm"
                                                            title="Delete Allover"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Pagination Controls ── */}
                        <div className="px-6 py-4 bg-[#fcfdff] border-t border-[#eee] flex items-center justify-between">
                            <div className="text-[13px] text-[#565959]">
                                Showing <span className="font-bold text-[#111]">{filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-[#111]">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-[#111]">{filtered.length}</span> items
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || filtered.length === 0}
                                    className="h-[31px] px-3 border border-[#ddd] rounded-[3px] text-[13px] font-bold hover:bg-[#f7f8fa] disabled:opacity-40 flex items-center gap-1 transition-all"
                                >
                                    <ChevronLeft size={16} /> Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {totalPages > 0 && Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`h-[31px] w-[31px] flex items-center justify-center rounded-[3px] text-[13px] font-bold transition-all ${currentPage === i + 1 ? 'bg-[#f0c14b] border-[#a88734] text-[#0f1111]' : 'border border-[#ddd] hover:bg-[#f7f8fa]'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || filtered.length === 0}
                                    className="h-[31px] px-3 border border-[#ddd] rounded-[3px] text-[13px] font-bold hover:bg-[#f7f8fa] disabled:opacity-40 flex items-center gap-1 transition-all"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">
                        <div className="flex-1 space-y-8">
                            {/* Product Info */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold text-[#111]">1. Choose Product</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="col-span-full">
                                            <Field label="Product Name (Select or Type New)" required>
                                                <div className="relative">
                                                    <input
                                                        list="catalog-products"
                                                        className={inputCls}
                                                        value={form.product_name}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
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
                                                        placeholder="Start typing product name..."
                                                    />
                                                    <datalist id="catalog-products">
                                                        {allProducts.filter(p => p.status === 'ACTIVE').map(p => (
                                                            <option key={p.id} value={p.name}>{p.sku ? `${p.name} (${p.sku})` : p.name}</option>
                                                        ))}
                                                    </datalist>
                                                </div>
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
                            </div>

                            {/* Quantity & Price */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold text-[#111]">2. Quantity & Pricing</h2>
                                </div>
                                <div className="p-6 space-y-8">
                                    <div className="flex bg-[#f3f3f3] border border-[#d5d9d9] rounded-[3px] p-[2px] w-[220px]">
                                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, purchase_type: 'single' }))} className={`flex-1 h-7 text-[11px] font-bold uppercase rounded-[2px] transition-all ${form.purchase_type === 'single' ? 'bg-white text-[#111] shadow-sm' : 'text-[#888]'}`}>One Unit</button>
                                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, purchase_type: 'carton' }))} className={`flex-1 h-7 text-[11px] font-bold uppercase rounded-[2px] transition-all ${form.purchase_type === 'carton' ? 'bg-white text-[#111] shadow-sm' : 'text-[#888]'}`}>By Box</button>
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
                                            <div className="sm:col-span-3 grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[4px] border border-[#eee]">
                                                <div><p className="text-[11px] font-bold text-[#565959] uppercase tracking-[0.1em]">Total Units</p><p className="text-[20px] font-bold text-[#111]">{form.total_quantity || 0} <span className="text-[13px] font-medium text-[#565959]">Units</span></p></div>
                                                <div><p className="text-[11px] font-bold text-[#565959] uppercase tracking-[0.1em]">Cost per Unit</p><p className="text-[20px] font-bold text-[#B12704]">{formatCurrency(form.price_per_item || 0)}</p></div>
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
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-full lg:w-[300px] shrink-0 space-y-6">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold text-[#111]">Actions</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <Btn className="w-full h-[35px] text-[14px] justify-center font-bold" onClick={handleSave} loading={isSubmitting}>
                                        <Save size={14} /> {isEditing ? 'Update Stock' : 'Save Stock'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#fcf8e3] border border-[#faebcc] rounded-[4px] p-5 text-[12px] text-[#8a6d3b] leading-relaxed italic shadow-sm">
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
                title={`Delete '${deleteModal.name}'?`}
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
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 text-left animate-in fade-in duration-200">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-[850px] w-full shadow-lg overflow-hidden animate-in zoom-in-95 duration-150">

                        {/* ── Simple Header ── */}
                        <div className="px-6 py-4 border-b border-[#ddd] bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package size={20} className="text-[#565959]" />
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#111]">{viewingStock.product_name}</h3>
                                    <p className="text-[11px] text-[#565959] font-medium uppercase tracking-wider">{viewingStock.category_name || 'General Inventory'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingStock(null)}
                                className="text-[#565959] hover:text-[#111] p-1 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* ── Content ── */}
                        <div className="max-h-[80vh] overflow-y-auto">
                            <div className="p-6 space-y-8">

                                {/* 1. Key Metrics Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#ddd] rounded-[4px] divide-y md:divide-y-0 md:divide-x divide-[#ddd]">
                                    <div className="p-5">
                                        <p className="text-[11px] font-bold text-[#565959] uppercase mb-1">Current Stock</p>
                                        <p className="text-[28px] font-bold text-[#111]">{viewingStock.total_quantity.toLocaleString()} <span className="text-[13px] font-normal text-slate-400">Units</span></p>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[11px] font-bold text-[#565959] uppercase mb-1">Unit Cost</p>
                                        <p className="text-[28px] font-bold text-[#B12704]">{formatCurrency(viewingStock.price_per_item)}</p>
                                    </div>
                                    <div className="p-5 bg-slate-50">
                                        <p className="text-[11px] font-bold text-[#565959] uppercase mb-1">Total Valuation</p>
                                        <p className="text-[28px] font-bold text-[#111]">{formatCurrency(viewingStock.total_quantity * viewingStock.price_per_item)}</p>
                                    </div>
                                </div>

                                {/* 2. Distribution & Details */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-[#111] border-b border-[#eee] pb-2">Location Breakdown</h4>
                                        <div className="space-y-2">
                                            {Object.entries((viewingStock.items || []).reduce((acc: any, curr: any) => {
                                                const name = curr.warehouse_name || 'Unassigned';
                                                acc[name] = (acc[name] || 0) + curr.total_quantity;
                                                return acc;
                                            }, {})).map(([whName, whTotal]: [string, any]) => (
                                                <div key={whName} className="flex items-center justify-between text-[13px] py-1">
                                                    <div className="flex items-center gap-2 text-[#565959]">
                                                        <MapPin size={14} />
                                                        <span>{whName}</span>
                                                    </div>
                                                    <span className="font-bold text-[#111]">{whTotal.toLocaleString()} units</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-[#111] border-b border-[#eee] pb-2">Technical Specs</h4>
                                        <div className="grid grid-cols-2 gap-4 text-[12px]">
                                            <div>
                                                <p className="text-[#565959] mb-0.5">Weight</p>
                                                <p className="font-bold text-[#111]">{viewingStock.weight || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#565959] mb-0.5">Variant / Type</p>
                                                <p className="font-bold text-[#111]">{viewingStock.size || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#565959] mb-0.5">SKU</p>
                                                <p className="font-bold text-[#111]">{viewingStock.sku || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#565959] mb-0.5">Barcode</p>
                                                <p className="font-bold text-[#111]">{viewingStock.barcode || '---'}</p>
                                            </div>
                                            <div className="col-span-full">
                                                <p className="text-[#565959] mb-0.5">Supplier</p>
                                                <p className="font-bold text-[#111]">{viewingStock.supplier_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#565959] mb-0.5">Date Added</p>
                                                <p className="font-bold text-[#111]">{new Date(viewingStock.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Arrival Log */}
                                <div className="space-y-4">
                                    <h4 className="text-[13px] font-bold text-[#111] border-b border-[#eee] pb-2">Arrival History</h4>
                                    <div className="border border-[#ddd] rounded-[4px] overflow-hidden">
                                        <table className="w-full text-left text-[12px] border-collapse">
                                            <thead>
                                                <tr className="bg-[#f7f8fa] border-b border-[#ddd] font-bold text-[#565959] uppercase">
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Location</th>
                                                    <th className="px-4 py-2 text-right">Quantity</th>
                                                    <th className="px-4 py-2 text-right">Unit Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#eee]">
                                                {(viewingStock.items || [viewingStock]).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 text-[#111] font-medium">{new Date(item.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-3 text-[#565959]">{item.warehouse_name}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-[#007600]">+{item.total_quantity.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-[#111]">{formatCurrency(item.price_per_item)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Simple Footer ── */}
                        <div className="px-6 py-4 border-t border-[#ddd] flex justify-end">
                            <button
                                onClick={() => setViewingStock(null)}
                                className="h-[31px] px-8 bg-[#f0c14b] border border-[#a88734] rounded-[3px] text-[13px] font-bold text-[#111] hover:bg-[#eeb933] transition-all shadow-sm"
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
