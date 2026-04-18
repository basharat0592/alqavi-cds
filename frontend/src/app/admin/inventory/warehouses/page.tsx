"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, MapPin,
    Warehouse, Box, RefreshCw, Save, X,
    ChevronRight, ChevronLeft, Trash, AlertTriangle
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

export default function WarehousesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [editWh, setEditWh] = useState<any | null>(null);
    const [deleteWh, setDeleteWh] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Quick Add Stock states
    const [quickAddWh, setQuickAddWh] = useState<any | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stockForm, setStockForm] = useState({
        product_name: '', category: '', supplier: '', purchase_type: 'single',
        total_quantity: 0, price_per_item: 0, date: new Date().toISOString().slice(0, 10),
        supplier_product_id: '', supplier_id: ''
    });
    const [addingStock, setAddingStock] = useState(false);

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

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockForm.product_name || !stockForm.supplier_id || !quickAddWh) return toast.error("Required fields missing");

        setAddingStock(true);
        try {
            const payload = {
                ...stockForm,
                warehouse: quickAddWh.id,
                category: stockForm.category || null, // Ensure category is null if empty
                total_quantity: Number(stockForm.total_quantity),
                price_per_item: Number(stockForm.price_per_item),
            };

            await inventoryService.createStock(payload);
            toast.success(`Successfully added ${stockForm.product_name} to ${quickAddWh.name}`);
            setQuickAddWh(null);
            load(); // This will now fetch the updated stock_count
        } catch (error: any) {
            const msg = error?.response?.data ? JSON.stringify(error.response.data) : "Failed to add stock";
            toast.error(msg);
            console.error("Stock Addition Error:", error);
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

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Warehouses</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Warehouses List' : (editWh ? 'Edit Warehouse' : 'Add Warehouse')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={load} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => { setEditWh(null); setForm({ name: '', location: '', capacity: '' }); setView('form'); }}><Plus size={14} /> Add Warehouse</Btn>
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
                                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{wh.stock_count || 0} Products</div>
                                                <button
                                                    onClick={() => {
                                                        setQuickAddWh(wh);
                                                        setStockForm({
                                                            product_name: '', category: '', supplier: '', purchase_type: 'single',
                                                            total_quantity: 0, price_per_item: 0, date: new Date().toISOString().slice(0, 10),
                                                            supplier_product_id: '', supplier_id: ''
                                                        });
                                                    }}
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
                        <form onSubmit={handleAddStock} className="p-6 space-y-4">
                            <Field label="1. Select Supplier" required>
                                <select 
                                    className={inputCls} 
                                    value={stockForm.supplier_id} 
                                    onChange={e => setStockForm(f => ({ ...f, supplier_id: e.target.value, supplier_product_id: '' }))}
                                >
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company || s.name}</option>)}
                                </select>
                            </Field>

                            <Field label="2. Search & Select Product" required>
                                <select
                                    className={`${inputCls} h-[40px] font-bold text-[14px] ${!stockForm.supplier_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    value={stockForm.supplier_product_id}
                                    disabled={!stockForm.supplier_id}
                                    onChange={(e) => {
                                        const p = allProducts.find(x => String(x.id) === e.target.value);
                                        if (p) {
                                            setStockForm(f => ({
                                                ...f,
                                                supplier_product_id: e.target.value,
                                                product_name: p.name,
                                                supplier: p.supplier,
                                                category: p.category || '',
                                                price_per_item: p.cost_price || p.price,
                                                total_quantity: p.quantity || 1
                                            }));
                                        }
                                    }}
                                >
                                    <option value="">{stockForm.supplier_id ? '-- Choose Product --' : 'Select a supplier first'}</option>
                                    {allProducts
                                        .filter(p => !stockForm.supplier_id || String(p.supplier_id) === String(stockForm.supplier_id))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'}) - {p.quantity} available</option>
                                        ))}
                                </select>
                            </Field>

                            <div className="pt-4 flex gap-2">
                                <Btn type="submit" className="flex-1 h-[45px] text-[15px] justify-center" loading={addingStock} disabled={!stockForm.supplier_product_id}>
                                    <Plus size={18} /> Add Selected Product Now
                                </Btn>
                                <Btn variant="secondary" onClick={() => setQuickAddWh(null)} className="h-[45px]">Cancel</Btn>
                            </div>
                        </form>
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
