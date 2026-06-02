"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit2, Trash2, MapPin,
    Warehouse, Box, RefreshCw, Save, X,
    ChevronRight, ChevronLeft, Trash, AlertTriangle,
    ArrowRightLeft, Eye, History, Clock, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - WAREHOUSES
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}>
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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function WarehousesPage() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'form' | 'products'>('list');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [editWh, setEditWh] = useState<any | null>(null);
    const [selectedWh, setSelectedWh] = useState<any | null>(null);
    const [whInventory, setWhInventory] = useState<any[]>([]);
    const [loadingInv, setLoadingInv] = useState(false);
    const [prodSearch, setProdSearch] = useState('');
    const [prodSupplier, setProdSupplier] = useState('');
    const [deleteWh, setDeleteWh] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [removeStock, setRemoveStock] = useState<any | null>(null);
    const [removing, setRemoving] = useState(false);
    const [moveStock, setMoveStock] = useState<any | null>(null);
    const [movingToWh, setMovingToWh] = useState('');
    const [moving, setMoving] = useState(false);
    const [transferQty, setTransferQty] = useState<number | string>('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
    const [viewMovements, setViewMovements] = useState<any | null>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    // Quick Add Stock states
    const [quickAddWh, setQuickAddWh] = useState<any | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stockForm, setStockForm] = useState({
        product_name: '', category: '', supplier: '', purchase_type: 'single',
        total_quantity: 0, price_per_item: 0, date: new Date().toISOString().slice(0, 10),
        product: ''
    });
    const [addingStock, setAddingStock] = useState(false);
    const [whProductIds, setWhProductIds] = useState<Set<number | string>>(new Set());

    const [form, setForm] = useState({
        name: '',
        location: '',
        capacity: ''
    });

    const load = async () => {
        setLoading(true);
        try {
            const [whs, prods, sups, cats] = await Promise.all([
                inventoryService.getWarehouses(),
                productService.getAllSupplier({ no_pagination: 'true' }),
                companyService.getSuppliers(),
                categoryService.getAll()
            ]);
            setWarehouses(whs || []);
            setAllProducts(prods.results || prods || []);
            setSuppliers(sups || []);
            setCategories(cats || []);
        } catch { toast.error("Refresh failure"); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleOpenAddProduct = async (wh: any) => {
        setQuickAddWh(wh);
        setStockForm({
            product_name: '', category: '', supplier: '', purchase_type: 'single',
            total_quantity: 0, price_per_item: 0, date: new Date().toISOString().slice(0, 10),
            product: ''
        });

        try {
            const existing = await inventoryService.getInventory({ warehouse: wh.id });
            const ids = new Set(existing.map((item: any) => item.product));
            setWhProductIds(ids);
        } catch (error) {
            console.error("Failed to fetch existing products", error);
            setWhProductIds(new Set());
        }
    };

    const handleViewProducts = async (wh: any) => {
        setSelectedWh(wh);
        setView('products');
        setLoadingInv(true);
        setProdSupplier(''); // Reset filter when entering
        setProdSearch('');
        try {
            const inv = await inventoryService.getInventory({ warehouse: wh.id });
            setWhInventory(inv || []);
        } catch {
            toast.error("Failed to fetch warehouse products");
        } finally {
            setLoadingInv(false);
        }
    };

    const handleExportCSV = () => {
        if (!whInventory.length) return toast.error("No data to export");

        const filtered = whInventory.filter(item => {
            const matchesSearch = item.product_name.toLowerCase().includes(prodSearch.toLowerCase());
            const matchesSupplier = !prodSupplier || String(item.supplier) === String(prodSupplier);
            return matchesSearch && matchesSupplier;
        });

        const headers = ["Product Name", "SKU", "Category", "Supplier", "Quantity", "Price", "Batch", "Expiry"];
        const rows = filtered.map(item => [
            item.product_name,
            item.sku || 'N/A',
            item.category_name || 'N/A',
            item.supplier_name || 'N/A',
            item.current_stock,
            item.price || item.unit_price || 0,
            item.batch_number || 'N/A',
            item.expiry_date || 'N/A'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `warehouse_${selectedWh?.name}_inventory.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Exported");
    };

    const handleConfirmRemove = async () => {
        if (!removeStock) return;
        setRemoving(true);
        try {
            await inventoryService.deleteInventory(removeStock.id);
            toast.success("Product removed from warehouse");
            setRemoveStock(null);
            handleViewProducts(selectedWh); // Refresh the list
            load(); // Update wh counts in main list
        } catch {
            toast.error("Failed to remove product");
        } finally {
            setRemoving(false);
        }
    };

    const handleConfirmMove = async () => {
        if (!moveStock || !movingToWh || !transferQty) return;
        const qty = Number(transferQty);
        if (isNaN(qty) || qty <= 0) return toast.error("Please enter a valid quantity");
        if (qty > (moveStock.total_quantity || 0)) return toast.error(`Insufficient stock. Max available: ${moveStock.total_quantity}`);

        setMoving(true);
        try {
            await inventoryService.transferStock(moveStock.id, {
                destination_warehouse: movingToWh,
                quantity: qty,
                date: transferDate
            });

            toast.success(`Successfully transferred ${qty} units`);
            setMoveStock(null);
            setMovingToWh('');
            setTransferQty('');
            handleViewProducts(selectedWh);
            load();
        } catch (error: any) {
            console.error("Move Error:", error);
            const msg = error?.response?.data?.error || "Failed to move stock";
            toast.error(msg);
        } finally {
            setMoving(false);
        }
    };

    const handleViewMovements = async (stock: any) => {
        setViewMovements(stock);
        setLoadingMovements(true);
        try {
            const data = await inventoryService.getStockMovements(stock.id);
            setMovements(data || []);
        } catch {
            toast.error("Failed to fetch movement history");
        } finally {
            setLoadingMovements(false);
        }
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockForm.product_name || !stockForm.supplier || !quickAddWh) return toast.error("Required fields missing");

        setAddingStock(true);
        try {
            const payload = {
                product: stockForm.product,
                product_name: stockForm.product_name,
                category: stockForm.category || null,
                supplier: stockForm.supplier || null,
                warehouse: quickAddWh.id,
                purchase_type: stockForm.purchase_type,
                total_quantity: Number(stockForm.total_quantity),
                price_per_item: Number(stockForm.price_per_item),
                date: stockForm.date,
            };

            await inventoryService.createStock(payload);
            toast.success(`Successfully added ${stockForm.product_name} to ${quickAddWh.name}`);
            setQuickAddWh(null);
            load(); // This will now fetch the updated stock_count
        } catch (error: any) {
            console.error("Stock Addition Error:", error);
            const msg = error?.response?.data ? JSON.stringify(error.response.data) : "Failed to add stock";
            toast.error(msg);
        } finally { setAddingStock(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.location) return toast.error("Required fields missing");
        setSaving(true);
        try {
            if (editWh) {
                await inventoryService.updateWarehouse(editWh.id, form);
                toast.success('Warehouse updated');
            } else {
                await inventoryService.createWarehouse(form);
                toast.success('Warehouse saved');
            }
            load(); setView('list');
        } catch { toast.error('Failed to save'); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteWh) return;
        setDeleting(true);
        try {
            await inventoryService.deleteWarehouse(deleteWh.id);
            setWarehouses(prev => prev.filter(w => w.id !== deleteWh.id));
            toast.success('Warehouse deleted');
        } catch { toast.error('Failed to delete'); } finally {
            setDeleting(false);
            setDeleteWh(null);
        }
    };

    const filtered = (warehouses || []).filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.location.toLowerCase().includes(search.toLowerCase())
    );

    const groupedWhInventory = React.useMemo(() => {
        const raw = (whInventory || []).filter(item => {
            const ms = (item.product_name || '').toLowerCase().includes(prodSearch.toLowerCase());
            const msup = !prodSupplier || String(item.supplier) === String(prodSupplier);
            return ms && msup;
        });

        const groups = new Map();
        raw.forEach(item => {
            // Group by [Name + Price + Weight + Size] (Since we are already inside a specific warehouse)
            const key = `${item.product_name.toLowerCase().trim()}_${item.price_per_item || item.unit_price || 0}_${item.weight || ''}_${item.size || ''}`;

            if (!groups.has(key)) {
                groups.set(key, { ...item, items: [item] });
            } else {
                const g = groups.get(key);
                g.items.push(item);
                g.total_quantity = (g.total_quantity || 0) + (item.total_quantity || 0);
                g.cartons = (g.cartons || 0) + (item.cartons || 0);
                if (new Date(item.date) > new Date(g.date)) g.date = item.date;
            }
        });
        return Array.from(groups.values());
    }, [whInventory, prodSearch, prodSupplier]);

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5 text-left">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Warehouses</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Warehouses List' :
                            view === 'products' ? `Products in ${selectedWh?.name}` :
                                (editWh ? 'Edit Warehouse' : 'Add Warehouse')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Btn variant="secondary" onClick={load} loading={loading} className="flex-1 sm:flex-initial justify-center">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => { setEditWh(null); setForm({ name: '', location: '', capacity: '' }); setView('form'); }} className="flex-1 sm:flex-initial justify-center"><Plus size={14} /> Add Warehouse</Btn>
                        </div>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1 font-bold">
                            <ChevronLeft size={14} /> Back to Warehouses
                        </button>
                    )}
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Area */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search warehouses..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                />
                            </div>
                        </div>

                        {/* List Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {loading && warehouses.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-[13px] text-[#565959]">Loading...</div>
                            ) : filtered.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-[13px] text-[#565959]">No warehouses found.</div>
                            ) : (
                                filtered.map(wh => (
                                    <div key={wh.id} className="bg-white border border-[#ddd] rounded-[4px] shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                        <div className="p-5 border-b border-[#eee] bg-[#fcfdff] flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-[#ddd] rounded-full flex items-center justify-center text-[#007185]">
                                                    <Warehouse size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[15px] group-hover:text-[#007185] truncate max-w-[150px]">{wh.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditWh(wh); setForm({ name: wh.name, location: wh.location, capacity: wh.capacity || '' }); setView('form'); }} className="p-1.5 text-[#565959] hover:bg-[#f3f3f3] rounded border border-[#ddd] bg-white"><Edit2 size={14} /></button>
                                                <button onClick={() => setDeleteWh(wh)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-[#ddd] bg-white"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-start gap-2 text-[13px] text-[#565959] h-10 line-clamp-2">
                                                <MapPin size={14} className="opacity-40 shrink-0 mt-0.5" /> {wh.location}
                                            </div>
                                            <div className="pt-3 border-t border-[#f7f7f7] flex items-center justify-between">
                                                <button
                                                    onClick={() => handleViewProducts(wh)}
                                                    className="text-[11px] font-bold text-[#007185] hover:text-[#c45500] uppercase tracking-widest hover:underline"
                                                >
                                                    {wh.stock_count || 0} Products
                                                </button>
                                                <button
                                                    onClick={() => handleOpenAddProduct(wh)}
                                                    className="text-[11px] font-bold text-[#007185] hover:text-[#c45500] flex items-center gap-1"
                                                >
                                                    <Plus size={12} /> Add Product
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : view === 'products' ? (
                    /* Products In Warehouse View */
                    <div className="space-y-6">
                        {/* Filters Bar */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={prodSearch}
                                    onChange={e => setProdSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                
                                />
                            </div>
                            <div className="relative w-full sm:w-[200px]">
                                <select
                                    value={prodSupplier}
                                    onChange={e => setProdSupplier(e.target.value)}
                                    className={`${inputCls} h-[35px] font-bold cursor-pointer pr-8 bg-white`}
                                >
                                    <option value="">Select Supplier to Filter</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company || s.name}</option>)}
                                </select>
                            </div>
                            <Btn variant="secondary" onClick={handleExportCSV} className="w-full sm:w-auto justify-center shrink-0">
                                <Box size={14} /> Export CSV
                            </Btn>
                        </div>

                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-500">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                <h2 className="text-[14px] font-bold text-[#111]">Inventory Details ({
                                    whInventory.filter(item => {
                                        const ms = (item.product_name || '').toLowerCase().includes(prodSearch.toLowerCase());
                                        const msup = !prodSupplier || String(item.supplier) === String(prodSupplier);
                                        return ms && msup;
                                    }).length
                                } items)</h2>
                                <Btn variant="secondary" onClick={() => handleViewProducts(selectedWh)} loading={loadingInv}>
                                    <RefreshCw size={14} className={loadingInv ? 'animate-spin' : ''} /> Reload
                                </Btn>
                            </div>
                            <div className="overflow-x-auto">
                                {loadingInv ? (
                                    <div className="py-20 text-center text-slate-500 italic">Syncing inventory...</div>
                                ) : whInventory.length === 0 ? (
                                    <div className="py-20 text-center text-slate-500 italic">No products found in this warehouse.</div>
                                ) : (
                                    <table className="w-full text-left text-[13px] border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#ddd] bg-[#f7f8fa] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3">Product Name</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3">Supplier</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Quantity</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Unit Price</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Received</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {groupedWhInventory.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-[#fcfdff] transition-colors group">
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4">
                                                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                                            <div className="font-bold text-[#007185]">{item.product_name}</div>
                                                            {(item.weight || item.size) && (
                                                                <div className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                                                    — {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                            {item.category_name || 'No Category'} <span className="hidden sm:inline">• SKU: {item.sku || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4">
                                                        <div className="text-[13px] text-[#111] font-medium">{item.supplier_name || 'Generic'}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right">
                                                        <div className="font-bold text-[14px] sm:text-[15px] text-[#111]">{(item.total_quantity || item.current_stock || 0).toLocaleString()}</div>
                                                        <div className="hidden sm:block text-[10px] text-[#007600] font-bold uppercase tracking-tighter">{item.purchase_type === 'carton' ? `${item.cartons} Boxes` : 'Loose'}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right font-bold text-[#B12704] whitespace-nowrap">
                                                        Rs. {(item.price_per_item || item.unit_price || item.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                        <div className="text-[12px] text-[#565959] font-bold">{new Date(item.date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleViewMovements(item)}
                                                                className="p-1 text-[#007185] hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-all shrink-0"
                                                                title="View Movement History"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setMoveStock(item);
                                                                    setTransferQty(item.total_quantity);
                                                                    setTransferDate(new Date().toISOString().slice(0, 10));
                                                                }}
                                                                className="p-1 text-[#007185] hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-all shrink-0"
                                                                title="Move to another Warehouse"
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setRemoveStock(item)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all shrink-0"
                                                                title="Remove from Warehouse"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline font-bold">
                                Close & Return to Warehouses
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Details</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="col-span-full">
                                            <Field label="Warehouse Name" required>
                                                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Warehouse" />
                                            </Field>
                                        </div>
                                        <div className="col-span-full">
                                            <Field label="Address" required>
                                                <input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Warehouse address" />
                                            </Field>
                                        </div>
                                        <Field label="Capacity (Optional)">
                                            <input type="number" className={inputCls} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Storage capacity" />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold text-center">Save</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {editWh ? 'Update' : 'Save'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {quickAddWh && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[8px] border border-[#ddd] overflow-hidden w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                            <h3 className="text-[16px] font-bold text-[#111]">Add Product to {quickAddWh.name}</h3>
                            <button onClick={() => setQuickAddWh(null)} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddStock} className="p-6 space-y-4 text-left">
                            <Field label="Search & Select Product" required>
                                <select
                                    className={`${inputCls} h-[40px] font-bold text-[14px]`}
                                    value={stockForm.product}
                                    onChange={(e) => {
                                        const p = allProducts.find(x => String(x.id) === e.target.value);
                                        if (p) {
                                            setStockForm(f => ({
                                                ...f,
                                                product: e.target.value,
                                                product_name: p.name,
                                                supplier: p.supplier_id || p.supplier || '',
                                                category: p.category || '',
                                                price_per_item: p.cost_price || p.price,
                                                total_quantity: p.quantity || 1
                                            }));
                                        }
                                    }}
                                >
                                    <option value="">-- Choose Product --</option>
                                    {allProducts
                                        .filter(p => !whProductIds.has(p.id))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'}) - {p.supplier_name || 'Generic'}</option>
                                        ))}
                                </select>
                            </Field>

                            <div className="pt-4 flex gap-2">
                                <Btn type="submit" className="flex-1 h-[45px] text-[15px] justify-center" loading={addingStock} disabled={!stockForm.product}>
                                    <Plus size={18} /> Add Selected Product Now
                                </Btn>
                                <Btn variant="secondary" onClick={() => setQuickAddWh(null)} className="h-[45px]">Cancel</Btn>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Move Product Modal */}
            {moveStock && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[4px] border border-[#ddd] overflow-hidden w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                            <h3 className="text-[15px] font-bold text-[#111]">Move Product</h3>
                            <button onClick={() => setMoveStock(null)} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-slate-50 p-4 rounded border border-[#eee] mb-2">
                                <div className="text-[10px] font-bold text-[#565959] uppercase tracking-wider mb-1">Product to Move</div>
                                <div className="text-[14px] font-bold text-[#111]">{moveStock.product_name}</div>
                                <div className="text-[11px] text-[#007185] font-medium mt-1">Available: {moveStock.total_quantity} Units</div>
                            </div>

                            <Field label="Units to Transfer" required>
                                <input
                                    type="number"
                                    className={inputCls + " h-[38px] font-bold"}
                                    value={transferQty}
                                    onChange={e => setTransferQty(e.target.value)}
                                    max={moveStock.total_quantity}
                                    min={1}
                                />
                            </Field>

                            <Field label="Transfer Date" required>
                                <input
                                    type="date"
                                    className={inputCls + " h-[38px]"}
                                    value={transferDate}
                                    onChange={e => setTransferDate(e.target.value)}
                                />
                            </Field>

                            <Field label="Destination Warehouse" required>
                                <select
                                    className={`${inputCls} h-[38px] cursor-pointer`}
                                    value={movingToWh}
                                    onChange={e => setMovingToWh(e.target.value)}
                                >
                                    <option value="">-- Select Destination --</option>
                                    {warehouses
                                        .filter(w => String(w.id) !== String(selectedWh?.id))
                                        .map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </Field>

                            <div className="pt-4 flex gap-2">
                                <Btn
                                    onClick={handleConfirmMove}
                                    className="flex-1 h-[42px] justify-center text-[14px] font-bold"
                                    loading={moving}
                                    disabled={!movingToWh || !transferQty}
                                >
                                    Initialize Transfer
                                </Btn>
                                <Btn variant="secondary" onClick={() => setMoveStock(null)} className="h-[42px]">Cancel</Btn>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Movements History Modal */}
            {viewMovements && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[8px] border border-[#ddd] overflow-hidden w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-[#ddd] rounded-full flex items-center justify-center text-[#007185]">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#111]">Movement History in {selectedWh?.name}</h3>
                                    <p className="text-[11px] text-[#565959] font-medium">{viewMovements.product_name} • {viewMovements.supplier_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewMovements(null)} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-[#F8F9FA]">
                            {loadingMovements ? (
                                <div className="py-20 text-center">
                                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#007185] mb-2" />
                                    <p className="text-[13px] text-[#565959]">Fetching movement logs...</p>
                                </div>
                            ) : movements.length === 0 ? (
                                <div className="py-20 text-center text-[#565959] italic">No movement records found in this warehouse.</div>
                            ) : (
                                <div className="space-y-4">
                                    {movements.map((m: any) => (
                                        <div key={m.id} className="bg-white border border-[#ddd] rounded-[6px] p-4 shadow-sm flex items-start gap-4">
                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                m.movement_type === 'PURCHASE' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                m.movement_type === 'TRANSFER_IN' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                m.movement_type === 'TRANSFER_OUT' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-slate-50 text-slate-600 border border-slate-100'
                                            }`}>
                                                {m.movement_type === 'PURCHASE' ? <Box size={16} /> :
                                                 m.movement_type === 'TRANSFER_IN' ? <ArrowDownLeft size={16} /> :
                                                 m.movement_type === 'TRANSFER_OUT' ? <ArrowUpRight size={16} /> :
                                                 <Clock size={16} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[14px] text-[#111]">{m.movement_type_display}</span>
                                                    </div>
                                                    <span className={`font-bold text-[15px] ${m.quantity > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                        {m.quantity > 0 ? '+' : ''}{m.quantity} Units
                                                    </span>
                                                </div>
                                                <div className="text-[12px] text-[#565959] flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                                                    <span className="flex items-center gap-1 font-medium"><Clock size={12} className="opacity-60" /> {new Date(m.created_at).toLocaleString()}</span>
                                                    {m.movement_type === 'PURCHASE' && m.supplier_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            Supplier: <span className="text-[#007185] not-italic">{m.supplier_name}</span>
                                                        </span>
                                                    )}
                                                    {m.from_warehouse_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            From: <span className="text-[#007185] not-italic">{m.from_warehouse_name}</span>
                                                        </span>
                                                    )}
                                                    {m.to_warehouse_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            To: <span className="text-[#007185] not-italic">{m.to_warehouse_name}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {m.description && (
                                                    <div className="text-[11px] bg-slate-50 p-2 rounded border border-[#eee] text-[#333] italic">
                                                        "{m.description}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-[#ddd] bg-[#f7f8fa] flex justify-end">
                            <Btn variant="secondary" onClick={() => setViewMovements(null)}>Close History</Btn>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Product Confirmation Modal */}
            {removeStock && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Remove Product?</h3>
                        <p className="text-[13px] text-[#565959]">
                            Remove <span className="font-bold text-[#111]">"{removeStock.product_name}"</span> from this warehouse?
                        </p>
                        <div className="mt-6 space-y-2">
                            <button
                                onClick={handleConfirmRemove}
                                disabled={removing}
                                className="w-full h-[35px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-bold shadow-sm active:bg-red-800 disabled:opacity-50"
                            >
                                {removing ? 'Removing...' : 'Yes, Remove Now'}
                            </button>
                            <button
                                onClick={() => setRemoveStock(null)}
                                disabled={removing}
                                className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteWh && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Delete?</h3>
                        <p className="text-[13px] text-[#565959]">
                            Delete <span className="font-bold text-[#111]">"{deleteWh.name}"</span>?
                        </p>
                        <div className="mt-6 space-y-2">
                            <button onClick={confirmDelete} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm active:bg-red-800">
                                {deleting ? 'Deleting...' : 'Delete Now'}
                            </button>
                            <button onClick={() => setDeleteWh(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
