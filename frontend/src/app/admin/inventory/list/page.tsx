"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, Edit2, RefreshCw, Package, Truck, MapPin, Save,
    ChevronRight, ChevronLeft, Trash
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { inventoryService } from '@/services/inventory.service';
import { companyService } from '@/services/company.service';
import { categoryService } from '@/services/category.service';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - STOCK HUB
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
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
const selectCls = `${inputCls} cursor-pointer`;

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
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string|number|null>(null);

    const [form, setForm] = useState({
        product_name: '', category: '', supplier: '', warehouse: '', purchase_type: 'single',
        cartons: 0, items_per_carton: 0, total_quantity: 0, price_per_carton: 0, price_per_item: 0,
        date: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        if (form.purchase_type === 'carton') {
            const total = (Number(form.cartons) || 0) * (Number(form.items_per_carton) || 0);
            const ppi = Number(form.items_per_carton) > 0 ? (Number(form.price_per_carton) || 0) / Number(form.items_per_carton) : 0;
            if (total !== form.total_quantity || ppi !== form.price_per_item) {
                setForm(f => ({ ...f, total_quantity: total, price_per_item: ppi }));
            }
        }
    }, [form.purchase_type, form.cartons, form.items_per_carton, form.price_per_carton]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
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
        } catch { 
            if (!silent) toast.error("Failed to load data"); 
        } finally { 
            if (!silent) setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, [selectedWarehouse]);

    // REAL-TIME AUTO-SYNC: Poll every 2s
    useEffect(() => {
        if (view !== 'list') return;
        const interval = setInterval(() => {
            if (!loading && !isSubmitting) {
                loadData(true);
            }
        }, 2000); // 2 seconds
        return () => clearInterval(interval);
    }, [view, loading, isSubmitting, selectedWarehouse]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_name || !form.supplier || !form.warehouse) return toast.error("Please fill required fields");

        setIsSubmitting(true);
        try {
            const payload = {
                product_name: form.product_name,
                category: form.category ? parseInt(form.category.toString()) : null,
                supplier: parseInt(form.supplier.toString()),
                warehouse: parseInt(form.warehouse.toString()),
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
        } catch { toast.error("Failed to save stock"); } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this stock record?')) return;
        try {
            await inventoryService.deleteInventory(id);
            toast.success('Deleted'); loadData();
        } catch { toast.error('Failed to delete'); }
    };

    const filtered = (stocks || []).filter(i => `${i.product_name} ${i.supplier_name}`.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Stocks</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Stock List' : (isEditing ? 'Edit Stock Arrival' : 'Add Stock Arrival')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2">
                             <Btn variant="secondary" onClick={loadData} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => {
                                setForm({ product_name: '', category: '', supplier: '', warehouse: selectedWarehouse || '', purchase_type: 'single', cartons: 0, items_per_carton: 0, total_quantity: 0, price_per_carton: 0, price_per_item: 0, date: new Date().toISOString().slice(0, 10) });
                                setIsEditing(false); setView('form');
                            }}><Plus size={14} /> Add Stock</Btn>
                        </div>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                            <ChevronLeft size={14} /> Back to List
                        </button>
                    )}
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by product or supplier..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                />
                            </div>
                            <div className="h-8 w-px bg-[#eee] mx-2" />
                            <select
                                value={selectedWarehouse}
                                onChange={e => setSelectedWarehouse(e.target.value)}
                                className={`${selectCls} w-[200px] h-[35px] font-bold`}
                            >
                                <option value="">All Warehouses</option>
                                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                            </select>
                        </div>

                        {/* List Table */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                        <th className="px-6 py-3">Product</th>
                                        <th className="px-6 py-3 text-right">Quantity</th>
                                        <th className="px-6 py-3 text-right">Cost Price</th>
                                        <th className="px-6 py-3">Supplier & Warehouse</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading && filtered.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">Loading...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No records found.</td></tr>
                                    ) : (
                                        filtered.map(s => (
                                            <tr key={s.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                                <td className="px-6 py-4">
                                                    <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer">{s.product_name}</div>
                                                    <div className="text-[11px] text-[#565959] uppercase font-bold mt-0.5">{s.category_name || 'Item'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-[15px] font-bold">{s.total_quantity.toLocaleString()}</div>
                                                    <div className="text-[10px] text-green-700 font-bold uppercase">{s.purchase_type === 'carton' ? `${s.cartons} Cartons` : 'Loose Units'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-bold text-[#111]">Rs. {Number(s.price_per_item).toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-[12px]">
                                                    <div className="text-[#111] font-bold flex items-center gap-1.5"><Truck size={14} className="opacity-40" /> {s.supplier_name}</div>
                                                    <div className="text-[#565959] flex items-center gap-1.5 mt-0.5"><MapPin size={12} className="opacity-40" /> {s.warehouse_name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => {
                                                            setForm({ product_name: s.product_name, category: s.category || '', supplier: s.supplier, warehouse: s.warehouse, purchase_type: s.purchase_type, cartons: s.cartons || 0, items_per_carton: s.items_per_carton || 0, total_quantity: s.total_quantity, price_per_carton: s.price_per_carton || 0, price_per_item: s.price_per_item, date: s.date });
                                                            setIsEditing(true); setEditingId(s.id); setView('form');
                                                        }} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(s.id)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Arrival Form */
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            {/* Product Info */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">1. Arrival Info</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="col-span-full">
                                            <Field label="Product Name" required>
                                                <input className={inputCls} value={form.product_name} onChange={(e) => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. Skin Serum" />
                                            </Field>
                                        </div>
                                        <Field label="Category">
                                            <select className={selectCls} value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Supplier" required>
                                            <select className={selectCls} value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))}>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Warehouse" required>
                                            <select className={selectCls} value={form.warehouse} onChange={(e) => setForm(f => ({ ...f, warehouse: e.target.value }))}>
                                                <option value="">Select Warehouse</option>
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Arrival Date" required>
                                            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity & Price */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">2. Quantity & Pricing</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex bg-[#f3f3f3] border border-[#d5d9d9] rounded-[3px] p-[2px] w-[200px]">
                                        <button type="button" onClick={() => setForm(f => ({ ...f, purchase_type: 'single' }))} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-[2px] transition-all ${form.purchase_type === 'single' ? 'bg-white text-[#111] shadow-sm' : 'text-[#565959]'}`}>By Unit</button>
                                        <button type="button" onClick={() => setForm(f => ({ ...f, purchase_type: 'carton' }))} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-[2px] transition-all ${form.purchase_type === 'carton' ? 'bg-white text-[#111] shadow-sm' : 'text-[#565959]'}`}>By Carton</button>
                                    </div>

                                    {form.purchase_type === 'carton' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-in slide-in-from-top-2 duration-200">
                                            <Field label="Total Cartons">
                                                <input type="number" className={inputCls} value={form.cartons} onChange={(e) => setForm(f => ({ ...f, cartons: Number(e.target.value) }))} />
                                            </Field>
                                            <Field label="Units / Carton">
                                                <input type="number" className={inputCls} value={form.items_per_carton} onChange={(e) => setForm(f => ({ ...f, items_per_carton: Number(e.target.value) }))} />
                                            </Field>
                                            <Field label="Price / Carton">
                                                <input type="number" step="0.01" className={inputCls} value={form.price_per_carton} onChange={(e) => setForm(f => ({ ...f, price_per_carton: Number(e.target.value) }))} />
                                            </Field>
                                            <div className="sm:col-span-3 grid grid-cols-2 gap-4 bg-[#fcfdff] p-4 rounded-[3px] border border-blue-50">
                                                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Quantity</p><p className="text-[18px] font-bold">{form.total_quantity} Units</p></div>
                                                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unit Cost</p><p className="text-[18px] font-bold text-[#c45500]">Rs. {Number(form.price_per_item).toLocaleString()}</p></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in slide-in-from-top-2 duration-200">
                                            <Field label="Total Quantity" required>
                                                <input type="number" className={inputCls} value={form.total_quantity} onChange={(e) => setForm(f => ({ ...f, total_quantity: Number(e.target.value) }))} />
                                            </Field>
                                            <Field label="Price per Unit (Rs.)" required>
                                                <input type="number" step="0.01" className={inputCls} value={form.price_per_item} onChange={(e) => setForm(f => ({ ...f, price_per_item: Number(e.target.value) }))} />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold">Actions</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                     <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={handleSave} loading={isSubmitting}>
                                        <Save size={14} /> {isEditing ? 'Update Stock' : 'Save Stock'}
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
        </div>
    );
}
