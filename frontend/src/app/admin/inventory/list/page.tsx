"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, Trash2, Edit2, Eye,
    AlertTriangle, RefreshCw, X, CheckCircle, Package
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { inventoryService, productService, companyService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils'; // if needed

const StatusPill = ({ status }: { status: string }) => {
    let colorClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    if (status === 'Low Stock' || status === 'Critical') colorClass = 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    else if (status === 'Pending') colorClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    else if (status === 'In Stock') colorClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${colorClass}`}>
            {status}
        </span>
    );
};

export default function InventoryListPage() {
    const searchParams = useSearchParams();
    const warehouseId = searchParams.get('warehouse') || '';

    const [view, setView] = useState<'list' | 'form'>('list');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseId);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string|number|null>(null);
    const [showAllFormProducts, setShowAllFormProducts] = useState(false);

    // ── Pagination State ──
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [form, setForm] = useState({
        product: '', warehouse: '', sku: '', barcode: '',
        quantity_available: 0, 
        quantity_reserved: 0,
        reorder_level: 0, 
        batch_number: '',
        supplier: '', purchase_type: 'single',
        cartons: 0, items_per_carton: 0, price_per_carton: 0, price_per_item: 0
    });

    useEffect(() => {
        if (form.purchase_type === 'carton') {
            const total = (Number(form.cartons) || 0) * (Number(form.items_per_carton) || 0);
            const ppi = Number(form.items_per_carton) > 0 ? (Number(form.price_per_carton) || 0) / Number(form.items_per_carton) : 0;
            if (total !== form.quantity_available || ppi !== form.price_per_item) {
                setForm(f => ({ ...f, quantity_available: total, price_per_item: ppi }));
            }
        }
    }, [form.purchase_type, form.cartons, form.items_per_carton, form.price_per_carton]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, whData, prodData, supData] = await Promise.all([
                inventoryService.getInventory(),
                inventoryService.getWarehouses(),
                productService.getAll({ all_items: 'true' } as any),
                companyService.getSuppliers()
            ]);
            const invDataArr = Array.isArray(invData) ? invData : (invData as any)?.results || [];
            const whDataArr = Array.isArray(whData) ? whData : (whData as any)?.results || [];
            const prodDataArr = Array.isArray(prodData) ? prodData : (prodData as any)?.results || [];
            const supDataArr = Array.isArray(supData) ? supData : (supData as any)?.results || [];

            const defaultWarehouse = whDataArr.find((w: any) => w.is_default) || whDataArr[0];
            let finalInventory: any[] = [];

            // Map and enrich inventory records that actually exist in the DB
            const recordsWithInfo = invDataArr.map((inv: any) => {
                const prod = prodDataArr.find((p: any) => String(p.id) === String(inv.product));
                const wh = whDataArr.find((w: any) => String(w.id) === String(inv.warehouse));
                return {
                    ...inv,
                    product_name: prod?.name || inv.product_name || 'Unknown Product',
                    sku: prod?.sku || inv.sku || 'N/A',
                    barcode: prod?.barcode || inv.barcode || 'N/A',
                    product_image: prod?.image || prod?.image_url || inv.product_image,
                    warehouse_name: wh?.name || inv.warehouse_name || 'Default Warehouse',
                    warehouse_type: wh?.warehouse_type || inv.warehouse_type,
                    // Handle field differences between Inventory and Stock models
                    quantity_available: inv.quantity_available ?? inv.total_quantity ?? 0
                };
            });

            // If a warehouse is selected, filter to only show records for that warehouse
            if (selectedWarehouse) {
                finalInventory = recordsWithInfo.filter((inv: any) => String(inv.warehouse) === String(selectedWarehouse));
            } else {
                finalInventory = recordsWithInfo;
            }

            setInventory(finalInventory); // Show everything without aggressive filters
            setWarehouses(whDataArr);
            setAllProducts(prodDataArr);
            setSuppliers(supDataArr);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!isEditing && form.supplier && form.product) {
                const prod = allProducts.find(p => String(p.id) === String(form.product));
                await inventoryService.createStock({
                    product_name: prod?.name || 'Unknown',
                    supplier: form.supplier,
                    purchase_type: form.purchase_type,
                    cartons: form.purchase_type === 'carton' ? form.cartons : null,
                    items_per_carton: form.purchase_type === 'carton' ? form.items_per_carton : null,
                    price_per_carton: form.purchase_type === 'carton' ? form.price_per_carton : null,
                    total_quantity: Number(form.quantity_available),
                    price_per_item: Number(form.price_per_item) || 0,
                });
            }

            const payload = {
                product: form.product, warehouse: form.warehouse,
                sku: form.sku, barcode: form.barcode,
                quantity_available: Number(form.quantity_available),
                reorder_level: Number(form.reorder_level),
                batch_number: form.batch_number || null,
            };
            if (isEditing && editingId) {
                await inventoryService.updateInventory(editingId, payload);
            } else {
                await inventoryService.createInventory(payload);
            }
            setView('list');
            loadData();
        } catch {
            alert("Error saving record");
        } finally { setIsSubmitting(false); }
    };

    const confirmDelete = async () => {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await inventoryService.deleteInventory(deleteRow.id);
            setDeleteRow(null);
            loadData();
        } catch { alert("Error deleting record"); } finally { setIsSubmitting(false); setDeleteRow(null); }
    };

    const handleEditClick = (item: any) => {
        setForm({
            product: String(item.product), warehouse: String(item.warehouse),
            sku: item.sku || '', barcode: item.barcode || '',
            quantity_available: item.quantity_available, quantity_reserved: 0,
            reorder_level: item.reorder_level || 0, batch_number: item.batch_number || '',
            supplier: '', purchase_type: 'single', cartons: 0, items_per_carton: 0, price_per_carton: 0, price_per_item: item.price_per_item || 0
        });
        setIsEditing(true); setEditingId(item.is_virtual ? null : item.id); setView('form');
    };

    const handleAddClick = () => {
        setForm({
            product: '', warehouse: selectedWarehouse || '', sku: '', barcode: '',
            quantity_available: 0, quantity_reserved: 0, reorder_level: 0, batch_number: '',
            supplier: '', purchase_type: 'single', cartons: 0, items_per_carton: 0, price_per_carton: 0, price_per_item: 0
        });
        setIsEditing(false); setEditingId(null); setView('form');
        setShowAllFormProducts(false);
    };

    const filtered = inventory.filter(item => {
        const matchesSearch = 
            (item.product_name?.toLowerCase().includes(search.toLowerCase())) ||
            (item.sku?.toLowerCase().includes(search.toLowerCase()));
        const matchesWarehouse = !selectedWarehouse || String(item.warehouse) === String(selectedWarehouse);
        const matchesSupplier = !selectedSupplier || String(item.supplier) === String(selectedSupplier);
        return matchesSearch && matchesWarehouse && matchesSupplier;
    });

    // ── Pagination Logic ──
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedWarehouse, selectedSupplier]);

    if (view === 'form') {
        return (
            <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isEditing ? 'Edit Stock Record' : 'New Stock Record'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage inbound procurement records</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm max-w-4xl">
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Col: Inventory Core */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Record Mapping</h3>
                                { (() => {
                                    const supplierProds = (form.supplier && !showAllFormProducts)
                                        ? allProducts.filter(p => String(p.supplier) === String(form.supplier))
                                        : allProducts;
                                    
                                    return (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span>Product <span className="text-red-500">*</span></span>
                                                    {form.supplier && (
                                                        <label className="flex items-center gap-1.5 cursor-pointer ml-2 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md hover:bg-slate-200 transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-3 h-3 rounded text-[#F59E0B] focus:ring-[#F59E0B]"
                                                                checked={showAllFormProducts}
                                                                onChange={(e) => setShowAllFormProducts(e.target.checked)}
                                                            />
                                                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-500">Show All</span>
                                                        </label>
                                                    )}
                                                </div>
                                                {form.supplier && !showAllFormProducts && (
                                                    <span className="text-[10px] bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                                                        {supplierProds.length} Items Available
                                                    </span>
                                                )}
                                            </label>
                                            <select 
                                                required 
                                                className={`px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 w-full transition-all ${showAllFormProducts ? 'border-amber-200 bg-amber-50/10' : ''}`} 
                                                value={form.product} 
                                                onChange={(e) => setForm({ ...form, product: e.target.value })}
                                            >
                                                <option value="">
                                                    {showAllFormProducts ? 'Select From All Products...' : (form.supplier ? 'Select Supplier Product...' : 'Select Product...')}
                                                </option>
                                                {supplierProds.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.product_name || p.name || p.title || 'Unnamed Product'} {showAllFormProducts && p.supplier_name ? `(${p.supplier_name})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })() }
                            </div>

                            {/* Right Col: Procurement Stock Entry */}
                            <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 pb-2">Procurement Definition</h3>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Supplier</label>
                                    <select required={!isEditing} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 w-full" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                                        <option value="">Select Supplier (for new stock)</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.company_name ? `- ${s.company_name}` : ''}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Purchase Package</label>
                                    <div className="flex bg-white dark:bg-[#1a252f] rounded-lg p-1 border border-slate-200 dark:border-white/10">
                                        <button type="button" onClick={() => setForm({ ...form, purchase_type: 'single' })} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${form.purchase_type === 'single' ? 'bg-[#F59E0B] text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Single Bulk</button>
                                        <button type="button" onClick={() => setForm({ ...form, purchase_type: 'carton' })} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${form.purchase_type === 'carton' ? 'bg-[#F59E0B] text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Carton Package</button>
                                    </div>
                                </div>

                                {form.purchase_type === 'carton' ? (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cartons Acquired</label>
                                            <input type="number" min="0" required={form.purchase_type==='carton'} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B]" value={form.cartons || ''} onChange={(e) => setForm({ ...form, cartons: Number(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Items per Carton</label>
                                            <input type="number" min="0" required={form.purchase_type==='carton'} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B]" value={form.items_per_carton || ''} onChange={(e) => setForm({ ...form, items_per_carton: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cost Per Carton ($)</label>
                                            <input type="number" min="0" required={form.purchase_type==='carton'} step="0.01" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B]" value={form.price_per_carton || ''} onChange={(e) => setForm({ ...form, price_per_carton: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2 mt-1 p-3 bg-white dark:bg-black/20 border border-slate-100 rounded-lg flex items-center justify-between text-xs font-bold text-slate-600">
                                            <span>Calculated Total Quantity:</span>
                                            <span className="text-emerald-600 text-sm">{form.quantity_available.toLocaleString()} Units</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Quantity <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" required className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B]" value={form.quantity_available || ''} onChange={(e) => setForm({ ...form, quantity_available: Number(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price / Item ($) <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" required step="0.01" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F59E0B]" value={form.price_per_item || ''} onChange={(e) => setForm({ ...form, price_per_item: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3">
                        <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg text-sm font-semibold hover:bg-[#F59E0B]/80 transition-colors shadow-sm disabled:opacity-50 uppercase tracking-widest">
                            {isSubmitting ? 'Saving...' : 'Commit Changes'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory List</h1>
                    <p className="page-subtitle">Manage and track your current stock levels</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Stock Entry
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by SKU or product..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={selectedWarehouse}
                    onChange={e => setSelectedWarehouse(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Warehouses</option>
                    {warehouses.filter(w => w.status?.toLowerCase() !== 'inactive').map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
                <select
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">Product / SKU</th>
                                <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                                <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Available Stock</th>
                                <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                                <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && paginatedData.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Package className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No stock records found.</p>
                                        <button
                                            onClick={handleAddClick}
                                            className="text-sm text-[#F59E0B] hover:underline font-medium"
                                        >
                                            Create your first stock entry
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item) => {
                                    const qtyStatus = item.is_virtual ? 'Pending' : (Number(item.quantity_available) <= Number(item.reorder_level || 0) ? 'Low Stock' : 'In Stock');
                                    
                                    return (
                                        <tr key={item.id} className="border-b border-slate-50 dark:border-white/[0.02] hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                            <td className="px-5 py-4">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{item.product_name || item.name || '—'}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{item.supplier_name || 'Generic'}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{Number(item.quantity_available).toLocaleString()}</p>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                                                    {item.purchase_type || 'Single'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setViewRow(item)}
                                                        className="p-2 rounded-xl text-slate-500 hover:text-[#F59E0B] hover:bg-slate-100 dark:hover:bg-[#F59E0B]/10 transition-all active:scale-90"
                                                        title="View details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-amber-500/10 transition-all active:scale-90"
                                                        title="Edit record"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteRow(item)}
                                                        className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-red-500/10 transition-all active:scale-90"
                                                        title="Remove inventory"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Footer ── */}
                {!loading && filtered.length > ITEMS_PER_PAGE && (
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold">{filtered.length}</span> entries
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 transition-colors active:scale-95"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    // Logic to show limited page numbers if too many
                                    if (totalPages > 5 && Math.abs(p - currentPage) > 1 && p !== 1 && p !== totalPages) {
                                        if (p === 2 || p === totalPages - 1) return <span key={p} className="text-slate-400 px-1">...</span>;
                                        return null;
                                    }
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === p ? 'bg-[#F59E0B] text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 transition-colors active:scale-95"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── View Modal ── */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        
                        {/* Amazon Style Header Bar */}
                        <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Manifest</h3>
                                <p className="text-[10px] text-[#F59E0B] font-bold uppercase tracking-widest mt-0.5">SKU: {viewRow.sku || 'N/A'}</p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Name</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewRow.product_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Storage Site</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewRow.warehouse_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Inventory Health</p>
                                    <StatusPill status={viewRow.is_virtual ? 'Pending' : (Number(viewRow.quantity_available) <= Number(viewRow.reorder_level || 0) ? 'Low Stock' : 'In Stock')} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Batch / Lot #</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewRow.batch_number || 'DEFAULT-00'}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Available Quantity</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{Number(viewRow.quantity_available).toLocaleString()}</p>
                                <p className="text-[10px] text-[#F59E0B] font-bold mt-2 uppercase">Ready for distribution</p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Record</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                Are you sure? This will remove the stock record <br/><strong className="text-slate-700 dark:text-slate-300">#{deleteRow.sku}</strong>.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setDeleteRow(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

