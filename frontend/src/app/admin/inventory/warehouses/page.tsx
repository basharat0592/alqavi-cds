"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit2, Trash2, MapPin,
    Warehouse, Box, RefreshCw, Save, X,
    ChevronLeft, AlertTriangle,
    ArrowRightLeft, Eye, History, Clock, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - WAREHOUSES
   ───────────────────────────────────────────────────────────────────────────── */
// Thin wrapper over the kit <Button> that preserves the existing `loading` prop API.
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => (
    <Button type={type} onClick={onClick} disabled={loading || disabled} variant={variant} className={className}>
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {children}
    </Button>
);

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;

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
        <div className="pb-20 text-left text-slate-800">
            <div className="max-w-[1100px] mx-auto">

                <PageHeader
                    hideBack={view !== 'list'}
                    title={
                        view === 'list' ? 'Warehouses' :
                            view === 'products' ? `Products in ${selectedWh?.name}` :
                                (editWh ? 'Edit Warehouse' : 'Add Warehouse')
                    }
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Warehouses', href: view === 'list' ? undefined : '#' },
                        ...(view !== 'list'
                            ? [{ label: view === 'products' ? (selectedWh?.name || 'Products') : (editWh ? 'Edit' : 'Add') }]
                            : []),
                    ]}
                    actions={
                        view === 'list' ? (
                            <>
                                <Btn variant="secondary" onClick={load} loading={loading} className="justify-center">
                                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                                </Btn>
                                <Btn onClick={() => { setEditWh(null); setForm({ name: '', location: '', capacity: '' }); setView('form'); }} className="justify-center"><Plus size={14} /> Add Warehouse</Btn>
                            </>
                        ) : (
                            <Button variant="ghost" onClick={() => setView('list')}>
                                <ChevronLeft size={14} /> Back to Warehouses
                            </Button>
                        )
                    }
                />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Area */}
                        <Card className="p-5">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search warehouses..."
                                    className={`${inputCls} pl-10`}
                                />
                            </div>
                        </Card>

                        {/* List Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {loading && warehouses.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-[13px] text-slate-500">Loading...</div>
                            ) : filtered.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-[13px] text-slate-500">No warehouses found.</div>
                            ) : (
                                filtered.map(wh => (
                                    <Card key={wh.id} className="hover:shadow-md transition-all group overflow-hidden">
                                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                                    <Warehouse size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[15px] text-slate-900 group-hover:text-indigo-600 truncate max-w-[150px]">{wh.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditWh(wh); setForm({ name: wh.name, location: wh.location, capacity: wh.capacity || '' }); setView('form'); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white"><Edit2 size={14} /></button>
                                                <button onClick={() => setDeleteWh(wh)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 bg-white"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-start gap-2 text-[13px] text-slate-600 h-10 line-clamp-2">
                                                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /> {wh.location}
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <button
                                                    onClick={() => handleViewProducts(wh)}
                                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest hover:underline"
                                                >
                                                    {wh.stock_count || 0} Products
                                                </button>
                                                <button
                                                    onClick={() => handleOpenAddProduct(wh)}
                                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                >
                                                    <Plus size={12} /> Add Product
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                ) : view === 'products' ? (
                    /* Products In Warehouse View */
                    <div className="space-y-6">
                        {/* Filters Bar */}
                        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={prodSearch}
                                    onChange={e => setProdSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className={`${inputCls} pl-10`}

                                />
                            </div>
                            <div className="relative w-full sm:w-[200px]">
                                <select
                                    value={prodSupplier}
                                    onChange={e => setProdSupplier(e.target.value)}
                                    className={`${inputCls} font-bold cursor-pointer pr-8`}
                                >
                                    <option value="">Select Supplier to Filter</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company || s.name}</option>)}
                                </select>
                            </div>
                            <Btn variant="secondary" onClick={handleExportCSV} className="w-full sm:w-auto justify-center shrink-0">
                                <Box size={14} /> Export CSV
                            </Btn>
                        </Card>

                        <Card className="overflow-hidden animate-in fade-in duration-500">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                <h2 className="text-[14px] font-bold text-slate-900">Inventory Details ({
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
                                            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3">Product Name</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3">Supplier</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Quantity</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Unit Price</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Received</th>
                                                <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {groupedWhInventory.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4">
                                                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                                            <div className="font-bold text-indigo-600">{item.product_name}</div>
                                                            {(item.weight || item.size) && (
                                                                <div className="text-[10px] text-indigo-500 font-black uppercase tracking-tight shrink-0">
                                                                    — {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                            {item.category_name || 'No Category'} <span className="hidden sm:inline">• SKU: {item.sku || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4">
                                                        <div className="text-[13px] text-slate-700 font-medium">{item.supplier_name || 'Generic'}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right tabular-nums">
                                                        <div className="font-bold text-[14px] sm:text-[15px] text-slate-900">{(item.total_quantity || item.current_stock || 0).toLocaleString()}</div>
                                                        <div className="hidden sm:block text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">{item.purchase_type === 'carton' ? `${item.cartons} Boxes` : 'Loose'}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                                        Rs. {(item.price_per_item || item.unit_price || item.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap tabular-nums">
                                                        <div className="text-[12px] text-slate-500 font-bold">{new Date(item.date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleViewMovements(item)}
                                                                className="p-1 text-indigo-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all shrink-0"
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
                                                                className="p-1 text-indigo-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all shrink-0"
                                                                title="Move to another Warehouse"
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setRemoveStock(item)}
                                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all shrink-0"
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
                        </Card>
                        <div className="flex justify-end">
                            <button onClick={() => setView('list')} className="text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold">
                                Close & Return to Warehouses
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900">Details</h2>
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
                            </Card>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <Card className="overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h3 className="text-[14px] font-bold text-center text-slate-900">Save</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Btn className="w-full text-[14px] justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {editWh ? 'Update' : 'Save'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-slate-500 hover:text-indigo-600 hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            <Modal open={!!quickAddWh} onClose={() => setQuickAddWh(null)} title={quickAddWh ? `Add Product to ${quickAddWh.name}` : ''}>
                <form onSubmit={handleAddStock} className="space-y-4 text-left">
                    <Field label="Search & Select Product" required>
                        <select
                            className={`${inputCls} font-bold text-[14px]`}
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
                        <Btn type="submit" className="flex-1 text-[15px] justify-center" loading={addingStock} disabled={!stockForm.product}>
                            <Plus size={18} /> Add Selected Product Now
                        </Btn>
                        <Btn variant="secondary" onClick={() => setQuickAddWh(null)}>Cancel</Btn>
                    </div>
                </form>
            </Modal>

            {/* Move Product Modal */}
            <Modal open={!!moveStock} onClose={() => setMoveStock(null)} title="Move Product" size="sm">
                {moveStock && (
                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 mb-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product to Move</div>
                            <div className="text-[14px] font-bold text-slate-900">{moveStock.product_name}</div>
                            <div className="text-[11px] text-indigo-600 font-medium mt-1">Available: {moveStock.total_quantity} Units</div>
                        </div>

                        <Field label="Units to Transfer" required>
                            <input
                                type="number"
                                className={inputCls + " font-bold"}
                                value={transferQty}
                                onChange={e => setTransferQty(e.target.value)}
                                max={moveStock.total_quantity}
                                min={1}
                            />
                        </Field>

                        <Field label="Transfer Date" required>
                            <input
                                type="date"
                                className={inputCls}
                                value={transferDate}
                                onChange={e => setTransferDate(e.target.value)}
                            />
                        </Field>

                        <Field label="Destination Warehouse" required>
                            <select
                                className={`${inputCls} cursor-pointer`}
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
                                className="flex-1 justify-center text-[14px] font-bold"
                                loading={moving}
                                disabled={!movingToWh || !transferQty}
                            >
                                Initialize Transfer
                            </Btn>
                            <Btn variant="secondary" onClick={() => setMoveStock(null)}>Cancel</Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Movements History Modal */}
            {viewMovements && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewMovements(null)} />
                    <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">Movement History in {selectedWh?.name}</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">{viewMovements.product_name} • {viewMovements.supplier_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewMovements(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto bg-[#F8FAFC]">
                            {loadingMovements ? (
                                <div className="py-20 text-center">
                                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" />
                                    <p className="text-[13px] text-slate-500">Fetching movement logs...</p>
                                </div>
                            ) : movements.length === 0 ? (
                                <div className="py-20 text-center text-slate-500 italic">No movement records found in this warehouse.</div>
                            ) : (
                                <div className="space-y-4">
                                    {movements.map((m: any) => (
                                        <div key={m.id} className="bg-white border border-slate-200/70 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-start gap-4">
                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                m.movement_type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                m.movement_type === 'TRANSFER_IN' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
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
                                                        <span className="font-bold text-[14px] text-slate-900">{m.movement_type_display}</span>
                                                    </div>
                                                    <span className={`font-bold text-[15px] tabular-nums ${m.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {m.quantity > 0 ? '+' : ''}{m.quantity} Units
                                                    </span>
                                                </div>
                                                <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                                                    <span className="flex items-center gap-1 font-medium"><Clock size={12} className="opacity-60" /> {new Date(m.created_at).toLocaleString()}</span>
                                                    {m.movement_type === 'PURCHASE' && m.supplier_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            Supplier: <span className="text-indigo-600 not-italic">{m.supplier_name}</span>
                                                        </span>
                                                    )}
                                                    {m.from_warehouse_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            From: <span className="text-indigo-600 not-italic">{m.from_warehouse_name}</span>
                                                        </span>
                                                    )}
                                                    {m.to_warehouse_name && (
                                                        <span className="flex items-center gap-1 font-medium italic">
                                                            To: <span className="text-indigo-600 not-italic">{m.to_warehouse_name}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {m.description && (
                                                    <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-700 italic">
                                                        "{m.description}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                            <Btn variant="secondary" onClick={() => setViewMovements(null)}>Close History</Btn>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Product Confirmation Modal */}
            <Modal open={!!removeStock} onClose={() => setRemoveStock(null)} size="sm">
                {removeStock && (
                    <div className="text-center py-2">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={24} className="text-rose-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-slate-900 mb-2">Remove Product?</h3>
                        <p className="text-[13px] text-slate-600">
                            Remove <span className="font-bold text-slate-900">"{removeStock.product_name}"</span> from this warehouse?
                        </p>
                        <div className="mt-6 space-y-2">
                            <Button
                                variant="danger"
                                onClick={handleConfirmRemove}
                                disabled={removing}
                                className="w-full"
                            >
                                {removing ? 'Removing...' : 'Yes, Remove Now'}
                            </Button>
                            <button
                                onClick={() => setRemoveStock(null)}
                                disabled={removing}
                                className="w-full text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal open={!!deleteWh} onClose={() => setDeleteWh(null)} size="sm">
                {deleteWh && (
                    <div className="text-center py-2">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={24} className="text-rose-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-slate-900 mb-2">Delete?</h3>
                        <p className="text-[13px] text-slate-600">
                            Delete <span className="font-bold text-slate-900">"{deleteWh.name}"</span>?
                        </p>
                        <div className="mt-6 space-y-2">
                            <Button variant="danger" onClick={confirmDelete} className="w-full">
                                {deleting ? 'Deleting...' : 'Delete Now'}
                            </Button>
                            <button onClick={() => setDeleteWh(null)} className="w-full text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
