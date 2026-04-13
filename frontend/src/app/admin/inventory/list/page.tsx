"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, Trash2, Edit2, Eye,
    AlertTriangle, RefreshCw, X, Package, Truck, Calendar, MapPin, Save
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { inventoryService } from '@/services/inventory.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import toast from 'react-hot-toast';

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
    const initialWarehouseId = searchParams.get('warehouse') || '';

    const [view, setView] = useState<'list' | 'form'>('list');
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouseId);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    
    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string|number|null>(null);

    const [form, setForm] = useState({
        product_name: '',
        category: '',
        supplier: '',
        warehouse: '',
        purchase_type: 'single',
        cartons: 0,
        items_per_carton: 0,
        total_quantity: 0,
        price_per_carton: 0,
        price_per_item: 0,
        date: new Date().toISOString().slice(0, 10),
    });

    // Auto-calculate totals for carton type
    useEffect(() => {
        if (form.purchase_type === 'carton') {
            const total = (Number(form.cartons) || 0) * (Number(form.items_per_carton) || 0);
            const ppi = Number(form.items_per_carton) > 0 ? (Number(form.price_per_carton) || 0) / Number(form.items_per_carton) : 0;
            if (total !== form.total_quantity || ppi !== form.price_per_item) {
                setForm(f => ({ ...f, total_quantity: total, price_per_item: ppi }));
            }
        }
    }, [form.purchase_type, form.cartons, form.items_per_carton, form.price_per_carton]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stockData, whData, supData, catData] = await Promise.all([
                inventoryService.getInventory({ warehouse: selectedWarehouse }),
                inventoryService.getWarehouses(),
                companyService.getSuppliers(),
                categoryService.getAll()
            ]);
            
            setStocks(stockData || []);
            setWarehouses(whData || []);
            setSuppliers(supData || []);
            setCategories(catData || []);
        } catch (error) { 
            console.error('Error loading data:', error);
            toast.error("Failed to sync inventory data");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [selectedWarehouse]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_name || !form.supplier || !form.warehouse) {
            toast.error("Missing required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                total_quantity: Number(form.total_quantity),
                price_per_item: Number(form.price_per_item),
                cartons: form.purchase_type === 'carton' ? Number(form.cartons) : null,
                items_per_carton: form.purchase_type === 'carton' ? Number(form.items_per_carton) : null,
                price_per_carton: form.purchase_type === 'carton' ? Number(form.price_per_carton) : null,
            };

            if (isEditing && editingId) {
                await inventoryService.updateInventory(editingId, payload);
                toast.success("Stock record updated");
            } else {
                await inventoryService.createStock(payload);
                toast.success("Stock entry committed");
            }
            setView('list');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Transaction failed");
        } finally { setIsSubmitting(false); }
    };

    const confirmDelete = async () => {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await inventoryService.deleteInventory(deleteRow.id);
            toast.success("Record purged");
            setDeleteRow(null);
            loadData();
        } catch { toast.error("Erasure failed"); } finally { setIsSubmitting(false); setDeleteRow(null); }
    };

    const handleEditClick = (item: any) => {
        setForm({
            product_name: item.product_name,
            category: item.category || '',
            supplier: item.supplier,
            warehouse: item.warehouse,
            purchase_type: item.purchase_type,
            cartons: item.cartons || 0,
            items_per_carton: item.items_per_carton || 0,
            total_quantity: item.total_quantity,
            price_per_carton: item.price_per_carton || 0,
            price_per_item: item.price_per_item,
            date: item.date,
        });
        setIsEditing(true); 
        setEditingId(item.id); 
        setView('form');
    };

    const handleAddClick = () => {
        setForm({
            product_name: '',
            category: (categories.length > 0 ? categories[0].id : ''),
            supplier: '',
            warehouse: selectedWarehouse || (warehouses.length > 0 ? warehouses[0].id : ''),
            purchase_type: 'single',
            cartons: 0,
            items_per_carton: 0,
            total_quantity: 0,
            price_per_carton: 0,
            price_per_item: 0,
            date: new Date().toISOString().slice(0, 10),
        });
        setIsEditing(false); 
        setEditingId(null); 
        setView('form');
    };

    const filtered = stocks.filter(item => 
        (item.product_name?.toLowerCase().includes(search.toLowerCase())) ||
        (item.supplier_name?.toLowerCase().includes(search.toLowerCase()))
    );

    if (view === 'form') {
        return (
            <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans text-left text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            {isEditing ? 'Modify Stock Record' : 'New Stock Record'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage inbound procurement records</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Col: Mapping */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5 pb-2">Record Mapping</h3>
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type="text" required className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Enter product identity..." />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Category <span className="text-red-500">*</span></label>
                                    <select required className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium cursor-pointer" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        <option value="">{categories.length === 0 ? 'No categories defined' : 'Assign Classification...'}</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Warehouse <span className="text-red-500">*</span></label>
                                        <select required className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium cursor-pointer" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                                            <option value="">{warehouses.length === 0 ? 'No warehouses available' : 'Select Target...'}</option>
                                            {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Date <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input type="date" required className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Procurement */}
                            <div className="space-y-6 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-white/10 pb-2">Procurement Definition</h3>
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Approved Supplier <span className="text-red-500">*</span></label>
                                    <select required className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium cursor-pointer" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                                        <option value="">{suppliers.length === 0 ? 'No suppliers available' : 'Select Source...'}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.company || s.name}</option>)}
                                    </select>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Purchase Package</label>
                                    <div className="flex bg-white dark:bg-black/20 font-black rounded-lg p-1 border border-slate-200 dark:border-white/10">
                                        <button type="button" onClick={() => setForm({ ...form, purchase_type: 'single' })} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${form.purchase_type === 'single' ? 'bg-[#F59E0B] text-white shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Single Bulk</button>
                                        <button type="button" onClick={() => setForm({ ...form, purchase_type: 'carton' })} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${form.purchase_type === 'carton' ? 'bg-[#F59E0B] text-white shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Carton Package</button>
                                    </div>
                                </div>

                                {form.purchase_type === 'carton' ? (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cartons</label>
                                            <input type="number" min="0" className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B]" value={form.cartons || ''} onChange={(e) => setForm({ ...form, cartons: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Items / Carton</label>
                                            <input type="number" min="0" className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B]" value={form.items_per_carton || ''} onChange={(e) => setForm({ ...form, items_per_carton: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost / Carton</label>
                                            <input type="number" min="0" step="0.01" className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B]" value={form.price_per_carton || ''} onChange={(e) => setForm({ ...form, price_per_carton: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-2 gap-3 mt-2">
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60 mb-1">Total Units</div>
                                                <div className="text-base font-black text-emerald-700 dark:text-emerald-400">{form.total_quantity.toLocaleString()}</div>
                                            </div>
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60 mb-1">Unit Cost</div>
                                                <div className="text-base font-black text-emerald-700 dark:text-emerald-400">Rs. {Number(form.price_per_item || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1.5 font-black">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Quantity <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" required className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B]" value={form.total_quantity || ''} onChange={(e) => setForm({ ...form, total_quantity: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1.5 font-black">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Price / Item <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" required step="0.01" className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B]" value={form.price_per_item || ''} onChange={(e) => setForm({ ...form, price_per_item: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-8 py-5 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end gap-4">
                        <button type="button" onClick={() => setView('list')} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all">
                            Discard Changes
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-3 px-10 py-3 bg-[#F59E0B] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-50 active:scale-95">
                            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Stock
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans text-left text-left">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="text-left">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Stock Inventory</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-bold">Manage and monitor cluster stock levels</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all"
                        title="Sync Data"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Inbound Entry
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
                        placeholder="Filter by product or supplier..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>
                <select
                    value={selectedWarehouse}
                    onChange={e => setSelectedWarehouse(e.target.value)}
                    className="px-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                    <option value="">All Storage Nodes</option>
                    {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Identifier</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Provider & Location</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">Quantity</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">Unit Price</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-center">Entry Date</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && stocks.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-5 py-5">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : stocks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-24 text-center">
                                        <Package className="h-12 w-12 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Void Stock Registry</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 dark:border-white/[0.02] hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{item.product_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-[#F59E0B] uppercase tracking-[0.1em] opacity-70">S/N: {item.id.slice(0, 8)}</span>
                                                <span className="text-slate-300 dark:text-white/10">•</span>
                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{item.category_name || 'UNGROUPED'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{item.supplier_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{item.warehouse_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white">{Number(item.total_quantity).toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.purchase_type} Entry</p>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <p className="text-sm font-black text-emerald-600">Rs. {Number(item.price_per_item).toLocaleString()}</p>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{item.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="p-2 rounded-xl text-slate-500 hover:text-[#F59E0B] hover:bg-slate-100 dark:hover:bg-[#F59E0B]/10 transition-all active:scale-90"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteRow(item)}
                                                    className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-red-500/10 transition-all active:scale-90"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center text-left">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Erase Entry?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Are you sure? This will remove the stock entry for <br/><strong className="text-slate-900 dark:text-white">"{deleteRow.product_name}"</strong>.
                            </p>
                            <div className="flex justify-end gap-3 text-left">
                                <button
                                    onClick={() => setDeleteRow(null)}
                                    className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                                >
                                    Purge Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
